'use strict';

const { Allocation, Ballot } = require('@metavcoin/metavcoinjs');

module.exports = function (allocation) {
  return new Ballot(new Allocation(allocation)).toHex();
};
