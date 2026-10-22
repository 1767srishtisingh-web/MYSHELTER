'use strict';

let createClient = null;
try {
  createClient = require('@supabase/supabase-js').createClient;
} catch (e) {
  // In offline dev or before npm install, createClient will be null
}

const memoryStore = {
  users: [],
  bookings: [],
  preferences: [],
  otp_codes: []
};

class MemoryQueryBuilder {
  constructor(table) {
    this.table = table;
    this.data = memoryStore[table] = memoryStore[table] || [];
    this._filters = [];
    this._orderCol = null;
    this._orderAsc = true;
    this._limit = null;
    this._operation = 'select';
    this._payload = null;
    this._onConflict = 'id';
  }

  select(fields) {
    if (this._operation !== 'insert' && this._operation !== 'update' && this._operation !== 'upsert') {
      this._operation = 'select';
    }
    return this;
  }

  insert(rows) {
    this._operation = 'insert';
    this._payload = Array.isArray(rows) ? rows : [rows];
    return this;
  }

  update(fields) {
    this._operation = 'update';
    this._payload = fields;
    return this;
  }

  upsert(row, options) {
    this._operation = 'upsert';
    this._payload = row;
    this._onConflict = (options && options.onConflict) || 'id';
    return this;
  }

  eq(col, val) {
    this._filters.push((item) => {
      if (item[col] === val) return true;
      if (typeof item[col] === 'string' && typeof val === 'string') {
        return item[col].toLowerCase() === val.toLowerCase();
      }
      return false;
    });
    return this;
  }

  neq(col, val) {
    this._filters.push((item) => item[col] !== val);
    return this;
  }

  gt(col, val) {
    this._filters.push((item) => item[col] > val);
    return this;
  }

  gte(col, val) {
    this._filters.push((item) => item[col] >= val);
    return this;
  }

  lt(col, val) {
    this._filters.push((item) => item[col] < val);
    return this;
  }

  lte(col, val) {
    this._filters.push((item) => item[col] <= val);
    return this;
  }

  order(col, opts) {
    this._orderCol = col;
    this._orderAsc = opts ? opts.ascending !== false : true;
    return this;
  }

  limit(n) {
    this._limit = n;
    return this;
  }

  async _execute() {
    if (this._operation === 'insert') {
      const inserted = [];
      for (const r of this._payload) {
        const item = Object.assign(
          {
            id: r.id || 'mem-' + Math.random().toString(36).substring(2, 10),
            created_at: r.created_at || new Date().toISOString()
          },
          r
        );
        this.data.push(item);
        inserted.push(item);
      }
      return { data: inserted, error: null };
    }

    if (this._operation === 'update') {
      const updated = [];
      for (const item of this.data) {
        if (this._filters.every((fn) => fn(item))) {
          Object.assign(item, this._payload);
          updated.push(item);
        }
      }
      return { data: updated, error: null };
    }

    if (this._operation === 'upsert') {
      const conflictCol = this._onConflict;
      const idx = this.data.findIndex((item) => item[conflictCol] === this._payload[conflictCol]);
      let saved;
      if (idx >= 0) {
        saved = Object.assign(this.data[idx], this._payload);
      } else {
        saved = Object.assign(
          {
            id: this._payload.id || 'mem-' + Math.random().toString(36).substring(2, 10),
            created_at: this._payload.created_at || new Date().toISOString()
          },
          this._payload
        );
        this.data.push(saved);
      }
      return { data: saved, error: null };
    }

    // select
    let res = this.data.filter((item) => this._filters.every((fn) => fn(item)));
    if (this._orderCol) {
      res = res.slice().sort((a, b) => {
        const va = a[this._orderCol];
        const vb = b[this._orderCol];
        if (va < vb) return this._orderAsc ? -1 : 1;
        if (va > vb) return this._orderAsc ? 1 : -1;
        return 0;
      });
    }
    if (this._limit) {
      res = res.slice(0, this._limit);
    }
    return { data: JSON.parse(JSON.stringify(res)), error: null };
  }

  async single() {
    const { data, error } = await this._execute();
    if (error) return { data: null, error };
    if (!data || (Array.isArray(data) && data.length === 0)) {
      return { data: null, error: { message: 'Row not found' } };
    }
    return { data: Array.isArray(data) ? data[0] : data, error: null };
  }

  async maybeSingle() {
    const { data, error } = await this._execute();
    if (error) return { data: null, error };
    if (!data || (Array.isArray(data) && data.length === 0)) {
      return { data: null, error: null };
    }
    return { data: Array.isArray(data) ? data[0] : data, error: null };
  }

  then(onFulfilled, onRejected) {
    return this._execute().then(onFulfilled, onRejected);
  }
}

function createMemoryClient() {
  return {
    from(table) {
      return new MemoryQueryBuilder(table);
    }
  };
}

let cachedClient = null;

function getSupabase() {
  if (cachedClient) return cachedClient;

  if (!createClient) {
    try {
      createClient = require('@supabase/supabase-js').createClient;
    } catch (e) {
      // In offline dev
    }
  }

  const url = process.env.SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_ANON_KEY;

  if (url && key && createClient) {
    try {
      cachedClient = createClient(url, key, {
        auth: {
          persistSession: false,
          autoRefreshToken: false
        }
      });
      return cachedClient;
    } catch (e) {
      console.warn('Could not initialize Supabase client, using memory fallback:', e.message);
    }
  }

  // Seamless fallback for local development or offline testing without Supabase credentials
  if (!cachedClient) {
    cachedClient = createMemoryClient();
  }

  return cachedClient;
}

module.exports = { getSupabase };
