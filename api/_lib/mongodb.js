'use strict';

const { MongoClient, ObjectId } = require('mongodb');
require('./env');

const MONGODB_URI = process.env.MONGODB_URI || '';
const MONGODB_DB_NAME = process.env.MONGODB_DB_NAME || 'myshelter';

let cachedClient = null;
let cachedDb = null;

class MemoryCollection {
  constructor(name) {
    this.name = name;
    this.docs = [];
  }

  _matches(doc, filter = {}) {
    if (!filter || Object.keys(filter).length === 0) return true;
    for (const [key, expected] of Object.entries(filter)) {
      if (key === '$or' && Array.isArray(expected)) {
        const anyMatch = expected.some((f) => this._matches(doc, f));
        if (!anyMatch) return false;
        continue;
      }
      if (expected && typeof expected === 'object' && !Array.isArray(expected)) {
        if (expected.$gt !== undefined && !(doc[key] > expected.$gt)) return false;
        if (expected.$gte !== undefined && !(doc[key] >= expected.$gte)) return false;
        if (expected.$lt !== undefined && !(doc[key] < expected.$lt)) return false;
        if (expected.$lte !== undefined && !(doc[key] <= expected.$lte)) return false;
        if (expected.$ne !== undefined && doc[key] === expected.$ne) return false;
        if (expected.$in !== undefined && (!Array.isArray(expected.$in) || !expected.$in.includes(doc[key]))) return false;
        continue;
      }
      const actual = doc[key];
      if (String(actual) !== String(expected)) return false;
    }
    return true;
  }

  async findOne(filter = {}) {
    const doc = this.docs.find((d) => this._matches(d, filter));
    return doc ? JSON.parse(JSON.stringify(doc)) : null;
  }

  find(filter = {}) {
    let results = this.docs.filter((d) => this._matches(d, filter)).map((d) => JSON.parse(JSON.stringify(d)));
    return {
      sort(sortObj = {}) {
        const [field, direction] = Object.entries(sortObj)[0] || [];
        if (field) {
          results.sort((a, b) => {
            if (a[field] < b[field]) return direction === -1 ? 1 : -1;
            if (a[field] > b[field]) return direction === -1 ? -1 : 1;
            return 0;
          });
        }
        return this;
      },
      limit(n) {
        if (typeof n === 'number' && n > 0) results = results.slice(0, n);
        return this;
      },
      async toArray() {
        return results;
      }
    };
  }

  async insertOne(doc) {
    const newDoc = {
      _id: doc._id || new ObjectId().toString(),
      ...JSON.parse(JSON.stringify(doc))
    };
    this.docs.push(newDoc);
    return { acknowledged: true, insertedId: newDoc._id };
  }

  async insertMany(docs) {
    const insertedIds = {};
    docs.forEach((d, i) => {
      const id = d._id || new ObjectId().toString();
      const newDoc = { _id: id, ...JSON.parse(JSON.stringify(d)) };
      this.docs.push(newDoc);
      insertedIds[i] = id;
    });
    return { acknowledged: true, insertedCount: docs.length, insertedIds };
  }

  async updateOne(filter, update, options = {}) {
    let index = this.docs.findIndex((d) => this._matches(d, filter));
    if (index === -1) {
      if (options.upsert) {
        const newDoc = {
          _id: new ObjectId().toString(),
          ...filter,
          ...(update.$set || update)
        };
        this.docs.push(newDoc);
        return { acknowledged: true, matchedCount: 0, modifiedCount: 0, upsertedCount: 1, upsertedId: newDoc._id };
      }
      return { acknowledged: true, matchedCount: 0, modifiedCount: 0 };
    }
    const current = this.docs[index];
    if (update.$set) Object.assign(current, JSON.parse(JSON.stringify(update.$set)));
    else Object.assign(current, JSON.parse(JSON.stringify(update)));
    return { acknowledged: true, matchedCount: 1, modifiedCount: 1 };
  }

  async deleteOne(filter) {
    const index = this.docs.findIndex((d) => this._matches(d, filter));
    if (index !== -1) {
      this.docs.splice(index, 1);
      return { acknowledged: true, deletedCount: 1 };
    }
    return { acknowledged: true, deletedCount: 0 };
  }

  async countDocuments(filter = {}) {
    return this.docs.filter((d) => this._matches(d, filter)).length;
  }
}

class MemoryDatabase {
  constructor() {
    this.collections = new Map();
  }

  collection(name) {
    if (!this.collections.has(name)) {
      this.collections.set(name, new MemoryCollection(name));
    }
    return this.collections.get(name);
  }
}

const memoryDbInstance = new MemoryDatabase();







async function getDb() {
  const uri = process.env.MONGODB_URI || MONGODB_URI;
  const dbName = process.env.MONGODB_DB_NAME || MONGODB_DB_NAME;

  if (!uri) {
    return {
      db: memoryDbInstance,
      client: null,
      isConnected: false,
      isMemory: true
    };
  }

  if (cachedClient && cachedDb) {
    return {
      db: cachedDb,
      client: cachedClient,
      isConnected: true,
      isMemory: false
    };
  }

  try {
    if (!global._mongoClientPromise) {
      const client = new MongoClient(uri, {
        maxPoolSize: 10,
        serverSelectionTimeoutMS: 5000
      });
      global._mongoClientPromise = client.connect();
    }

    cachedClient = await global._mongoClientPromise;
    cachedDb = cachedClient.db(dbName);

    return {
      db: cachedDb,
      client: cachedClient,
      isConnected: true,
      isMemory: false
    };
  } catch (err) {
    console.warn('[MYSHELTER MongoDB] Connection error, using memory fallback:', err.message);
    return {
      db: memoryDbInstance,
      client: null,
      isConnected: false,
      isMemory: true
    };
  }
}

module.exports = {
  getDb,
  ObjectId
};
