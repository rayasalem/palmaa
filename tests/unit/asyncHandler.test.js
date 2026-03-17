/**
 * Unit tests for server/utils/asyncHandler.js
 */
import { asyncHandler } from '../../server/utils/asyncHandler.js';

describe('asyncHandler', () => {
  it('forwards resolved value to res.json', async () => {
    const fn = async (req, res) => {
      res.json({ ok: true });
    };
    const wrapped = asyncHandler(fn);
    const req = {};
    const res = { json: jest.fn() };
    const next = jest.fn();
    await wrapped(req, res, next);
    expect(res.json).toHaveBeenCalledWith({ ok: true });
    expect(next).not.toHaveBeenCalled();
  });

  it('calls next with error when handler rejects', async () => {
    const err = new Error('Async failure');
    const fn = async () => {
      throw err;
    };
    const wrapped = asyncHandler(fn);
    const req = {};
    const res = {};
    const next = jest.fn();
    await wrapped(req, res, next);
    expect(next).toHaveBeenCalledWith(err);
  });

  it('calls next when handler returns rejected promise', async () => {
    const err = new Error('Rejected');
    const fn = () => Promise.reject(err);
    const wrapped = asyncHandler(fn);
    const next = jest.fn();
    await wrapped({}, {}, next);
    expect(next).toHaveBeenCalledWith(err);
  });
});
