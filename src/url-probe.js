import { StateLog } from './state-log.js';
import { logger } from 'log-instance';

/**
 * Probe a single URL and log the JSON results
 */
export class UrlProbe {
  /**
   * Build a UrlProbe
   * @param {UrlProbeOptions} opts
   * @param {URL} opts.url - REQUIRED: URL to probe
   * @param {StateLog} opts.stateLog - REQUIRED: probe result log 
   * @param {object} opts.jsonFilter - state normalization properties (undefined)
   * @param {String} opts.type - client type (heartbeat)
   */
  constructor(opts={}) {
    const msg = 'UrlProbe.ctor()';
    let { 
      url, 
      jsonFilter, 
      type = "heartbeat",
      stateLog, 
    } = opts;

    try {
      new URL(url);
    } catch(e) {
      throw new Error(`${msg} Invalid url: ${url}`);
    }
    if (stateLog == null) {
      throw new Error(`${msg} stateLog is required`);
    }

    Object.assign(this, {url, type, jsonFilter, stateLog });
  }

  /**
   * fetch with timeout
   * @param {URL} url - as for fetch()
   * @param {fetchOptions} opts - as for fetch()
   * @param {milliseconds} opts.timeout - required timeout (1000)
   */
  static async fetch(url, opts={}) {
    const msg = 'UrlProbe.fetch()';
    let { signal, timeout = 1000 } = opts;
    let fetchOpts = Object.assign({}, opts);
    let res;

    try {
      if (signal == null) {
        fetchOpts.signal = AbortSignal.timeout( timeout );
        delete fetchOpts.timeout;
      }
      res = await fetch(url, fetchOpts)
    } catch(e){
      logger.warn(msg, url, '=>', e.message);
      throw e;
    }

    return res;
  }

  /**
   * Normalize given state for storage.
   * Normalization can remove unwanted properties.
   * Normalization can also trim property values. 
   * @param {serializable} state - raw state to be normalized
   * @param {StateLogProperties} properties - normalization parameters. 
   *
   * @returns {serializable} normalized object as defined by:
   * * If properties.xyz is true, that property is included 
   * in normalized state.
   * * If properties.xyz is a string, 
   * the string is converted to a regular expression and
   * the state value of that property is stripped of 
   * anything that does not match that regular expression.
   * * If properties.xyz is anything else, an Error is thrown.
   * * If properties is null, the entire state is left as is.
   */
  static normalizeState(state, properties) {
    const msg = `UrlProbe.normalizeState()`;

    if (properties == null) {
      return state; 
    }

    if (typeof state === "object") {
      let normalized = {};
      Object.entries(properties).forEach(entry=>{
        let [ key, value ] = entry;
        let stateValue = state[key];

        if (value === true) {
          normalized[key] = stateValue;
        } else if (typeof value === 'string') {
          let re = new RegExp(value);
          if (stateValue != null) {
            let match = stateValue.match(re);
            normalized[key] = match ? match[0] : 'no-match';
          }
        } else {
          let emsg = `${msg} cannot normalize "${key}"`;
          console.log({entry, value, key, normalized});
          throw new Error(emsg);
        }
      });
      state = normalized;
    }
    return state;
  }

  /**
   * Probe the URL once and log the result for the given timestamp
   * in the StateLog of the probe.
   * 
   * @param {Date} date - logging date (vs. result date)
   */
  async probe(date = new Date()) {
    const msg = 'UrlProbe.probe()';
    let { jsonFilter, stateLog, url } = this;
    let errorHandler = (e)=>{
      let state = {
        error: e.message,
        message: `${msg} could not fetch json`,
      }
      stateLog.update(state, date);
    }

    let res;
    try {
      res = await UrlProbe.fetch(url);
      let { status } = res;
      if (jsonFilter !== undefined) {
        let json = await res.json();
        try {
          json = UrlProbe.normalizeState(json, jsonFilter);
          let state = { status, json, };
          stateLog.update(state, date);
        } catch(e) {
          errorHandler(e);
        }
      } else {
        let state = { status };
        stateLog.update(state, date);
      }
    } catch (e) {
      errorHandler(e);
    }

    return res;
  }
    
}
