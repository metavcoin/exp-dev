'use strict';

const { Ballot } = require('@metavcoin/metavcoinjs');

module.exports = function(ballot) {
  try {
    const data = Ballot.fromHex(ballot).getData().toJson();
    return data;
  } catch (error) {
    return null;
  }
}