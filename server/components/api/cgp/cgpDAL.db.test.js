'use strict';

const test = require('blue-tape');
const { Decimal } = require('decimal.js');
const { Address, ContractId } = require('@metavcoin/metavcoinjs');
const truncate = require('../../../../test/lib/truncate');
const txsDAL = require('../txs/txsDAL');
const blocksDAL = require('../blocks/blocksDAL');
const outputsDAL = require('../outputs/outputsDAL');
const contractsDAL = require('../contracts/contractsDAL');
const executionsDAL = require('../executions/executionsDAL');
const cgpDAL = require('./cgpDAL');
const SnapshotsTaker = require('../../../../worker/jobs/snapshots/SnapshotsTaker');
const createDemoBlocksFromTo = require('../../../../test/lib/createDemoBlocksFromTo');
const faker = require('faker');

const CONTRACT_ID = '00000000abbf8805a203197e4ad548e4eaa2b16f683c013e31d316f387ecf7adc65b3fb2';
const TALLY_BLOCK = 100;
const ADDRESS_AMOUNTS = {
  tzn11: 10000000000,
  tzn12: 10100000000,
  tzn13: 10200000000,
};

test('cgpDAL.findLastValidVoteBlockNumber() (DB)', async function (t) {
  await wrapTest('Given no votes', async (given) => {
    await createDemoData();

    const result = await cgpDAL.findLastValidVoteBlockNumber({
      startBlockNumber: 100,
      type: 'allocation',
    });
    t.equal(result, 0, `${given}: should return zero`);
  });

  await wrapTest('Given votes, current interval = 2', async (given) => {
    await createDemoData({ toBlock: 101 });

    await addVoteForAllAddresses({ blockNumber: 91, type: 'allocation', ballot: '0105' });

    const result = await cgpDAL.findLastValidVoteBlockNumber({
      startBlockNumber: 101,
      type: 'allocation',
    });
    t.equal(result, 91, `${given}: should return the highest block with a vote`);
  });

  await wrapTest('Given votes in first interval, current interval = 4', async (given) => {
    await createDemoData({ toBlock: 301 });

    await addVoteForAllAddresses({ blockNumber: 91, type: 'allocation', ballot: '0105' });

    // start block is 200, we want to find the first vote starting at prev interval
    const result = await cgpDAL.findLastValidVoteBlockNumber({
      startBlockNumber: 200,
      type: 'allocation',
    });
    t.equal(result, 91, `${given}: should return the highest block with a vote`);
  });

  await wrapTest(
    'Given votes in intervals 1 and 3, current interval = 4, searching for interval 3',
    async (given) => {
      await createDemoData({ toBlock: 301 });

      await addVoteForAllAddresses({ blockNumber: 91, type: 'allocation', ballot: '0105' });
      await addVoteForAllAddresses({ blockNumber: 291, type: 'allocation', ballot: '0105' });

      // for calculating the winner of interval 3, to find the prev allocation winner
      const result = await cgpDAL.findLastValidVoteBlockNumber({
        startBlockNumber: 200,
        type: 'allocation',
      });
      t.equal(result, 91, `${given}: should return the highest block with a vote`);
    }
  );

  await wrapTest(
    'Given votes in intervals 1 and 3, current interval = 6, searching for interval 5',
    async (given) => {
      await createDemoData({ toBlock: 601 });

      await addVoteForAllAddresses({ blockNumber: 91, type: 'allocation', ballot: '0105' });
      await addVoteForAllAddresses({ blockNumber: 291, type: 'allocation', ballot: '0105' });

      // for calculating the winner of interval 5
      const result = await cgpDAL.findLastValidVoteBlockNumber({
        startBlockNumber: 400,
        type: 'allocation',
      });
      t.equal(result, 291, `${given}: should return the highest block with a vote`);
    }
  );
});

test('cgpDAL.findAllVotesInInterval() (DB)', async function (t) {
  await wrapTest('Given no votes', async (given) => {
    await createDemoData();

    const allocationVotes = await cgpDAL.findAllVotesInInterval({
      snapshot: 90,
      beginBlock: 95,
      endBlock: 100,
      type: 'allocation',
    });
    const payoutVotes = await cgpDAL.findAllVotesInInterval({
      snapshot: 90,
      beginBlock: 95,
      endBlock: 100,
      type: 'payout',
    });
    t.assert(
      allocationVotes.length === 0 && payoutVotes.length === 0,
      `${given}: should return an empty array`
    );
  });

  await wrapTest('Given 1 allocation vote per address', async (given) => {
    await createDemoData();

    await addVoteForAllAddresses({ blockNumber: 96, type: 'allocation', ballot: '123456789' });

    const allocationVotes = await cgpDAL.findAllVotesInInterval({
      snapshot: 90,
      beginBlock: 95,
      endBlock: 100,
      type: 'allocation',
    });
    const payoutVotes = await cgpDAL.findAllVotesInInterval({
      snapshot: 90,
      beginBlock: 95,
      endBlock: 100,
      type: 'payout',
    });
    t.equal(allocationVotes.length, 3, `${given}: should return 3 allocation votes`);
    t.equal(payoutVotes.length, 0, `${given}: should return 0 payout votes`);
  });

  await wrapTest('Given 1 payout vote per address', async (given) => {
    await createDemoData();

    await addVoteForAllAddresses({ blockNumber: 96, type: 'payout', ballot: '123456789' });

    const allocationVotes = await cgpDAL.findAllVotesInInterval({
      snapshot: 90,
      beginBlock: 95,
      endBlock: 100,
      type: 'allocation',
    });
    const payoutVotes = await cgpDAL.findAllVotesInInterval({
      snapshot: 90,
      beginBlock: 95,
      endBlock: 100,
      type: 'payout',
    });
    t.equal(allocationVotes.length, 0, `${given}: should return 0 allocation votes`);
    t.equal(payoutVotes.length, 3, `${given}: should return 3 payout votes`);
  });

  await wrapTest('Given 1 nomination vote per address', async (given) => {
    await createDemoData();

    await addVoteForAllAddresses({ blockNumber: 91, type: 'nomination', ballot: '123456789' });

    const allocationVotes = await cgpDAL.findAllVotesInInterval({
      snapshot: 90,
      beginBlock: 95,
      endBlock: 100,
      type: 'allocation',
    });
    const payoutVotes = await cgpDAL.findAllVotesInInterval({
      snapshot: 90,
      beginBlock: 95,
      endBlock: 100,
      type: 'payout',
    });
    const nominationVotes = await cgpDAL.findAllVotesInInterval({
      snapshot: 90,
      beginBlock: 90,
      endBlock: 95,
      type: 'nomination',
    });
    t.equal(allocationVotes.length, 0, `${given}: should return 0 allocation votes`);
    t.equal(payoutVotes.length, 0, `${given}: should return 3 payout votes`);
    t.equal(nominationVotes.length, 3, `${given}: should return 3 nomination votes`);
  });

  await wrapTest(
    'Given same address votes for payout and allocation in different blocks',
    async (given) => {
      await createDemoData();
      await addVote({ address: 'tzn11', blockNumber: 96, type: 'allocation', ballot: '1' });
      await addVote({ address: 'tzn11', blockNumber: 97, type: 'payout', ballot: '2' });

      const allocationVotes = await cgpDAL.findAllVotesInInterval({
        snapshot: 90,
        beginBlock: 95,
        endBlock: 100,
        type: 'allocation',
      });
      const payoutVotes = await cgpDAL.findAllVotesInInterval({
        snapshot: 90,
        beginBlock: 95,
        endBlock: 100,
        type: 'payout',
      });
      t.assert(
        allocationVotes.length === 1 && allocationVotes[0].ballot === '1',
        `${given}: should return the allocation vote`
      );
      t.assert(
        payoutVotes.length === 1 && payoutVotes[0].ballot === '2',
        `${given}: should return the payout vote`
      );
    }
  );

  await wrapTest('Given a nomination vote at the end block of Nomination phase', async (given) => {
    await createDemoData();
    await addVoteForAllAddresses({ blockNumber: 95, type: 'nomination', ballot: '1' });
    const votes = await cgpDAL.findAllVotesInInterval({
      snapshot: 90,
      beginBlock: 90,
      endBlock: 95,
      type: 'nomination',
    });
    t.equal(votes.length, 3, `${given}: should return the vote`);
  });

  await wrapTest('Given a payout/allocation vote at the tally block', async (given) => {
    await createDemoData();
    await addVoteForAllAddresses({ blockNumber: 100, type: 'allocation', ballot: '1' });
    await addVoteForAllAddresses({ blockNumber: 100, type: 'payout', ballot: '1' });
    const allocationVotes = await cgpDAL.findAllVotesInInterval({
      snapshot: 90,
      beginBlock: 95,
      endBlock: 100,
      type: 'allocation',
    });
    const payoutVotes = await cgpDAL.findAllVotesInInterval({
      snapshot: 90,
      beginBlock: 95,
      endBlock: 100,
      type: 'payout',
    });
    t.assert(
      allocationVotes.length === 3 && payoutVotes.length === 3,
      `${given}: should return the vote`
    );
  });
});

test('cgpDAL.countVotesInInterval() (DB)', async function (t) {
  await wrapTest('Given no votes', async (given) => {
    await createDemoData();

    const nominationVotes = await cgpDAL.countVotesInInterval({
      beginBlock: 90,
      endBlock: 95,
      type: 'nomination',
    });
    const allocationVotes = await cgpDAL.countVotesInInterval({
      beginBlock: 95,
      endBlock: 100,
      type: 'allocation',
    });
    const payoutVotes = await cgpDAL.countVotesInInterval({
      beginBlock: 95,
      endBlock: 100,
      type: 'payout',
    });
    t.assert(
      allocationVotes === 0 && payoutVotes === 0 && nominationVotes === 0,
      `${given}: should return 0`
    );
  });

  await wrapTest('Given some votes', async (given) => {
    await createDemoData();

    await addVote({ address: 'tzn11', blockNumber: 91, type: 'nomination', ballot: '1' });
    await addVote({ address: 'tzn11', blockNumber: 96, type: 'payout', ballot: '1' });
    await addVote({ address: 'tzn11', blockNumber: 96, type: 'allocation', ballot: '2' });
    await addVote({ address: 'tzn12', blockNumber: 97, type: 'payout', ballot: '3' });
    await addVote({ address: 'tzn13', blockNumber: 98, type: 'allocation', ballot: '4' });

    const nominationVotes = await cgpDAL.countVotesInInterval({
      beginBlock: 90,
      endBlock: 95,
      type: 'nomination',
    });
    const allocationVotes = await cgpDAL.countVotesInInterval({
      beginBlock: 95,
      endBlock: 100,
      type: 'allocation',
    });
    const payoutVotes = await cgpDAL.countVotesInInterval({
      beginBlock: 95,
      endBlock: 100,
      type: 'payout',
    });
    t.assert(
      allocationVotes === 2 && payoutVotes === 2 && nominationVotes === 1,
      `${given}: should return the right amount of votes`
    );
  });
});

test('cgpDAL.findAllVoteResults() (DB)', async function (t) {
  await wrapTest('Given no votes', async (given) => {
    await createDemoData();
    const nominationResults = await cgpDAL.findAllVoteResults({
      snapshot: 90,
      beginBlock: 90,
      endBlock: 95,
      type: 'nomination',
    });
    const allocationResults = await cgpDAL.findAllVoteResults({
      snapshot: 90,
      beginBlock: 95,
      endBlock: 100,
      type: 'allocation',
    });
    const payoutResults = await cgpDAL.findAllVoteResults({
      snapshot: 90,
      beginBlock: 95,
      endBlock: 100,
      type: 'payout',
    });
    t.assert(
      nominationResults.length === 0 &&
        allocationResults.length === 0 &&
        payoutResults.length === 0,
      `${given}: should return an empty array`
    );
  });

  await wrapTest('Given 1 vote per address', async (given) => {
    await createDemoData();
    await addVoteForAllAddresses({ blockNumber: 91, type: 'nomination', ballot: '1' });
    await addVoteForAllAddresses({ blockNumber: 96, type: 'payout', ballot: '2' });
    await addVoteForAllAddresses({ blockNumber: 96, type: 'allocation', ballot: '3' });

    const [nomination, allocation, payout] = await Promise.all([
      cgpDAL.findAllVoteResults({
        snapshot: 90,
        beginBlock: 90,
        endBlock: 95,
        type: 'nomination',
      }),
      cgpDAL.findAllVoteResults({
        snapshot: 90,
        beginBlock: 95,
        endBlock: 100,
        type: 'allocation',
      }),
      cgpDAL.findAllVoteResults({
        snapshot: 90,
        beginBlock: 95,
        endBlock: 100,
        type: 'payout',
      }),
    ]);
    t.assert(
      nomination.length === 1 && allocation.length === 1 && payout.length === 1,
      `${given}: should return 1 result per type`
    );
    t.assert(
      nomination[0].ballot === '1' && allocation[0].ballot === '3' && payout[0].ballot === '2',
      `${given}: should have the right ballot`
    );
    t.assert(
      Number(nomination[0].zpAmount) === 303 &&
        Number(allocation[0].zpAmount) === 303 &&
        Number(payout[0].zpAmount) === 303,
      `${given}: should have a sum of the addresses' amount`
    );
  });

  await wrapTest('Given nomination vote at the end height of Nomination phase', async (given) => {
    await createDemoData();
    await addVote({ address: 'tzn11', blockNumber: 95, type: 'nomination', ballot: '1' });
    const nomination = await cgpDAL.findAllVoteResults({
      snapshot: 90,
      beginBlock: 90,
      endBlock: 95,
      type: 'nomination',
    });
    t.assert(nomination.length === 1, `${given}: should calculate only nomination votes`);
  });

  await wrapTest('Given votes at the begin height of Vote phase', async (given) => {
    await createDemoData();
    await addVote({ address: 'tzn11', blockNumber: 96, type: 'allocation', ballot: '2' });
    await addVote({ address: 'tzn11', blockNumber: 96, type: 'payout', ballot: '3' });
    const [allocation, payout] = await Promise.all([
      cgpDAL.findAllVoteResults({
        snapshot: 90,
        beginBlock: 95,
        endBlock: 100,
        type: 'allocation',
      }),
      cgpDAL.findAllVoteResults({
        snapshot: 90,
        beginBlock: 95,
        endBlock: 100,
        type: 'payout',
      }),
    ]);
    t.assert(
      allocation.length === 1 && payout.length === 1,
      `${given}: should calculate only allocation and payout votes`
    );
  });

  await wrapTest('Given votes at the tally', async (given) => {
    await createDemoData();
    await addVote({ address: 'tzn11', blockNumber: 100, type: 'allocation', ballot: '2' });
    await addVote({ address: 'tzn11', blockNumber: 100, type: 'payout', ballot: '3' });
    const [allocation, payout] = await Promise.all([
      cgpDAL.findAllVoteResults({
        snapshot: 90,
        beginBlock: 95,
        endBlock: 100,
        type: 'allocation',
      }),
      cgpDAL.findAllVoteResults({
        snapshot: 90,
        beginBlock: 95,
        endBlock: 100,
        type: 'payout',
      }),
    ]);
    t.assert(
      allocation.length === 1 && payout.length === 1,
      `${given}: should calculate only allocation and payout votes`
    );
  });

  await wrapTest('Given each vote for different ballot', async (given) => {
    await createDemoData();
    await addVote({ address: 'tzn11', blockNumber: 91, type: 'nomination', ballot: '1' });
    await addVote({ address: 'tzn12', blockNumber: 92, type: 'nomination', ballot: '2' });
    await addVote({ address: 'tzn13', blockNumber: 93, type: 'nomination', ballot: '3' });

    const results = await cgpDAL.findAllVoteResults({
      snapshot: 90,
      beginBlock: 90,
      endBlock: 95,
      type: 'nomination',
    });
    t.equal(results.length, 3, `${given}: should return a result per ballot`);
    t.assert(
      results.every((item) => {
        switch (item.ballot) {
          case '1':
            return ADDRESS_AMOUNTS.tzn11 / 100000000 === Number(item.zpAmount);
          case '2':
            return ADDRESS_AMOUNTS.tzn12 / 100000000 === Number(item.zpAmount);
          case '3':
            return ADDRESS_AMOUNTS.tzn13 / 100000000 === Number(item.zpAmount);
        }
        // in case something else
        return false;
      }),
      `${given}: should return the right amount per address`
    );
  });

  await wrapTest('Given some votes for different ballot and some for the same', async (given) => {
    await createDemoData();
    await addVote({ address: 'tzn11', blockNumber: 91, type: 'nomination', ballot: '1' });
    await addVote({ address: 'tzn12', blockNumber: 92, type: 'nomination', ballot: '1' });
    await addVote({ address: 'tzn13', blockNumber: 93, type: 'nomination', ballot: '2' });

    const results = await cgpDAL.findAllVoteResults({
      snapshot: 90,
      beginBlock: 90,
      endBlock: 95,
      type: 'nomination',
    });
    t.equal(results.length, 2, `${given}: should return a result per ballot`);
    t.deepEqual(
      results.map((item) => item.ballot),
      ['1', '2'],
      `${given}: should return all voted for ballots`
    );
  });
});

test('cgpDAL.countAllVoteResults() (DB)', async function (t) {
  await wrapTest('Given no votes', async (given) => {
    await createDemoData();
    const [nomination, allocation, payout] = await Promise.all([
      cgpDAL.countAllVoteResults({
        beginBlock: 90,
        endBlock: 95,
        type: 'nomination',
      }),
      cgpDAL.countAllVoteResults({
        beginBlock: 95,
        endBlock: 100,
        type: 'allocation',
      }),
      cgpDAL.countAllVoteResults({
        beginBlock: 95,
        endBlock: 100,
        type: 'payout',
      }),
    ]);
    t.assert(
      nomination === 0 && allocation === 0 && payout === 0,
      `${given}: should return no results`
    );
  });

  await wrapTest('Given some votes', async (given) => {
    await createDemoData();
    await addVoteForAllAddresses({ ballot: '1', blockNumber: 91, type: 'nomination' });
    await addVoteForAllAddresses({ ballot: '2', blockNumber: 96, type: 'allocation' });
    await addVoteForAllAddresses({ ballot: '3', blockNumber: 97, type: 'payout' });

    const [nomination, allocation, payout] = await Promise.all([
      cgpDAL.countAllVoteResults({
        beginBlock: 90,
        endBlock: 95,
        type: 'nomination',
      }),
      cgpDAL.countAllVoteResults({
        beginBlock: 95,
        endBlock: 100,
        type: 'allocation',
      }),
      cgpDAL.countAllVoteResults({
        beginBlock: 95,
        endBlock: 100,
        type: 'payout',
      }),
    ]);
    t.assert(
      nomination === 1 && allocation === 1 && payout === 1,
      `${given}: should count results per ballot`
    );
  });
});

test('cgpDAL.findAllBallots() (DB)', async function (t) {
  await wrapTest('Given no votes', async (given) => {
    await createDemoData();
    const [nomination, allocation, payout] = await Promise.all([
      cgpDAL.findAllBallots({
        snapshot: 90,
        beginBlock: 90,
        endBlock: 95,
        type: 'nomination',
      }),
      cgpDAL.findAllBallots({
        snapshot: 90,
        beginBlock: 95,
        endBlock: 100,
        type: 'allocation',
      }),
      cgpDAL.findAllBallots({
        snapshot: 90,
        beginBlock: 95,
        endBlock: 100,
        type: 'payout',
      }),
    ]);
    t.assert(
      nomination.length === 0 && allocation.length === 0 && payout.length === 0,
      `${given}: should return an empty array`
    );
  });

  await wrapTest('Given some votes in 1st interval', async (given) => {
    await createDemoData();
    await addVote({ address: 'tzn11', blockNumber: 91, type: 'nomination', ballot: '1' });
    await addVote({ address: 'tzn11', blockNumber: 96, type: 'payout', ballot: 'ballotPayout1' });
    await addVote({ address: 'tzn11', blockNumber: 96, type: 'allocation', ballot: '2' });
    await addVote({ address: 'tzn12', blockNumber: 97, type: 'payout', ballot: 'ballotPayout2' });

    const [nomination, allocation, payout] = await Promise.all([
      cgpDAL.findAllBallots({
        snapshot: 90,
        beginBlock: 90,
        endBlock: 95,
        type: 'nomination',
      }),
      cgpDAL.findAllBallots({
        snapshot: 90,
        beginBlock: 95,
        endBlock: 100,
        type: 'allocation',
      }),
      cgpDAL.findAllBallots({
        snapshot: 90,
        beginBlock: 95,
        endBlock: 100,
        type: 'payout',
      }),
    ]);
    t.assert(
      nomination.length === 1 && allocation.length === 1 && payout.length === 2,
      `${given}: should return all ballots`
    );
    t.assert(
      payout[0].ballot === 'ballotPayout2',
      `${given}: should return the ballot with most zp first`
    );
  });

  await wrapTest('Given valid votes in 2 intervals', async (given) => {
    await createDemoData({ toBlock: 200 });
    await addVote({ address: 'tzn11', blockNumber: 91, type: 'nomination', ballot: '1' });
    await addVote({ address: 'tzn11', blockNumber: 96, type: 'payout', ballot: '2' });
    await addVote({ address: 'tzn11', blockNumber: 96, type: 'allocation', ballot: '3' });

    await addVote({ address: 'tzn11', blockNumber: 191, type: 'nomination', ballot: '4' });
    await addVote({ address: 'tzn11', blockNumber: 196, type: 'payout', ballot: '5' });
    await addVote({ address: 'tzn11', blockNumber: 196, type: 'allocation', ballot: '6' });

    const [nomination, allocation, payout] = await Promise.all([
      cgpDAL.findAllBallots({
        snapshot: 190,
        beginBlock: 190,
        endBlock: 195,
        type: 'nomination',
      }),
      cgpDAL.findAllBallots({
        snapshot: 190,
        beginBlock: 195,
        endBlock: 200,
        type: 'allocation',
      }),
      cgpDAL.findAllBallots({
        snapshot: 190,
        beginBlock: 195,
        endBlock: 200,
        type: 'payout',
      }),
    ]);
    t.assert(
      nomination.length === 1 && allocation.length === 1 && payout.length === 1,
      `${given}: should return all ballots from the given interval`
    );
  });
});

test('cgpDAL.findAllNominees() + cgpDAL.countAllNominees() (DB)', async function (t) {
  await wrapTest('Given no votes', async (given) => {
    await createDemoData();
    const [nominees, count] = await Promise.all([
      cgpDAL.findAllNominees({
        snapshot: 90,
        tally: 100,
        threshold: '0',
      }),
      cgpDAL.countAllNominees({
        snapshot: 90,
        tally: 100,
        threshold: '0',
      }),
    ]);
    t.equal(nominees.length, 0, `${given}: should return an empty array`);
    t.equal(count, 0, `${given}: should return count 0`);
  });

  await wrapTest('Given some votes', async (given) => {
    await createDemoData({ amountMultiplier: 100 });
    await addVote({
      address: 'tzn11',
      blockNumber: 91,
      type: 'nomination',
      ballot: 'ballotNomination1',
    });
    await addVote({
      address: 'tzn12',
      blockNumber: 92,
      type: 'nomination',
      ballot: 'ballotNomination2',
    });

    await addVote({ address: 'tzn11', blockNumber: 96, type: 'allocation', ballot: '2' });
    await addVote({ address: 'tzn12', blockNumber: 97, type: 'payout', ballot: '3' });

    const [nominees, count] = await Promise.all([
      cgpDAL.findAllNominees({
        snapshot: 90,
        tally: 100,
        threshold: '0',
      }),
      cgpDAL.countAllNominees({
        snapshot: 90,
        tally: 100,
        threshold: '0',
      }),
    ]);
    t.equal(nominees.length, 2, `${given}: should return all nomination ballots`);
    t.equal(count, 2, `${given}: should return the right count`);
    t.assert(
      nominees[0].ballot === 'ballotNomination2',
      `${given}: should return the ballot with most zp first`
    );
  });

  await wrapTest('Given some valid votes and some with zp < threshold', async (given) => {
    // threshold 133.5

    await createDemoData({
      amountMultiplier: 100,
      extraAddressAmounts: { tzn14: 1, tzn15: 133500000, tzn16: 133499999 },
    });
    await addVote({
      address: 'tzn11',
      blockNumber: 91,
      type: 'nomination',
      ballot: 'ballotPayout1',
    });
    await addVote({
      address: 'tzn12',
      blockNumber: 92,
      type: 'nomination',
      ballot: 'ballotPayout2',
    });
    // this one has too little zp
    await addVote({
      address: 'tzn14',
      blockNumber: 93,
      type: 'nomination',
      ballot: 'ballotPayout3',
    });
    // this one has exactly 3%
    await addVote({
      address: 'tzn15',
      blockNumber: 94,
      type: 'nomination',
      ballot: 'ballotPayout4',
    });
    // this one has 1 kalapa less than 3%
    await addVote({
      address: 'tzn16',
      blockNumber: 94,
      type: 'nomination',
      ballot: 'ballotPayout4',
    });

    await addVote({ address: 'tzn11', blockNumber: 96, type: 'allocation', ballot: '2' });
    await addVote({ address: 'tzn12', blockNumber: 97, type: 'payout', ballot: 'ballotPayout2' });

    const [nominees, count] = await Promise.all([
      cgpDAL.findAllNominees({
        snapshot: 90,
        tally: 100,
        threshold: '133.5',
      }),
      cgpDAL.countAllNominees({
        snapshot: 90,
        tally: 100,
        threshold: '133.5',
      }),
    ]);
    t.equal(nominees.length, 3, `${given}: should return only ballots which >= 3%`);
    t.equal(count, 3, `${given}: should return the right count`);
  });
});

test('cgpDAL.findZpParticipated() (DB)', async function (t) {
  await wrapTest('Given no votes', async (given) => {
    await createDemoData();
    const [nomination, allocation, payout] = await Promise.all([
      cgpDAL.findZpParticipated({
        snapshot: 90,
        beginBlock: 90,
        endBlock: 95,
        type: 'nomination',
      }),
      cgpDAL.findZpParticipated({
        snapshot: 90,
        beginBlock: 95,
        endBlock: 100,
        type: 'allocation',
      }),
      cgpDAL.findZpParticipated({
        snapshot: 90,
        beginBlock: 95,
        endBlock: 100,
        type: 'payout',
      }),
    ]);
    t.assert(
      Number(nomination) === 0 && Number(allocation) === 0 && Number(payout) === 0,
      `${given}: should return zero`
    );
  });

  await wrapTest('Given valid votes', async (given) => {
    await createDemoData();
    await addVote({ address: 'tzn11', blockNumber: 91, type: 'nomination', ballot: '1' });
    await addVote({ address: 'tzn12', blockNumber: 92, type: 'nomination', ballot: '2' });
    await addVote({ address: 'tzn13', blockNumber: 93, type: 'nomination', ballot: '3' });

    await addVote({ address: 'tzn11', blockNumber: 96, type: 'payout', ballot: '1' });
    await addVote({ address: 'tzn12', blockNumber: 97, type: 'payout', ballot: '2' });
    await addVote({ address: 'tzn13', blockNumber: 98, type: 'payout', ballot: '3' });
    await addVote({ address: 'tzn12', blockNumber: 99, type: 'allocation', ballot: '4' });

    const [nomination, allocation, payout] = await Promise.all([
      cgpDAL.findZpParticipated({
        snapshot: 90,
        beginBlock: 90,
        endBlock: 95,
        type: 'nomination',
      }),
      cgpDAL.findZpParticipated({
        snapshot: 90,
        beginBlock: 95,
        endBlock: 100,
        type: 'allocation',
      }),
      cgpDAL.findZpParticipated({
        snapshot: 90,
        beginBlock: 95,
        endBlock: 100,
        type: 'payout',
      }),
    ]);
    t.assert(
      Number(nomination) === 30300000000 &&
        Number(payout) === 30300000000 &&
        Number(allocation) == 10100000000,
      `${given}: Should return the sum of kalapas for the type`
    );
  });
});

test.onFinish(() => {
  blocksDAL.db.sequelize.close();
});

async function wrapTest(given, test) {
  await truncate();
  await test(given);
}

/**
 * Creates a range of blocks, some addresses with amount and take a snapshot
 */
async function createDemoData({
  toBlock = TALLY_BLOCK,
  amountMultiplier = 1,
  extraAddressAmounts = {},
} = {}) {
  // create a range of blocks
  await createDemoBlocksFromTo(1, toBlock);
  // add amount to some addresses all in block 1
  const addressAmounts = Object.assign({}, ADDRESS_AMOUNTS, extraAddressAmounts);
  for (let i = 0; i < Object.keys(addressAmounts).length; i++) {
    const address = Object.keys(addressAmounts)[i];
    const amount = new Decimal(addressAmounts[address]).times(amountMultiplier).toString();
    const tx = await txsDAL.create({
      blockNumber: 1,
      index: i,
      version: 0,
      inputCount: 0,
      outputCount: 1,
      hash: faker.random.uuid(),
    });
    await outputsDAL.create({
      blockNumber: 1,
      txId: tx.id,
      lockType: 'PK',
      address,
      asset: '00',
      amount,
      index: 0,
    });
  }

  // add the voting contract
  await contractsDAL.create({
    id: CONTRACT_ID,
    address: Address.getPublicKeyHashAddress('test', ContractId.fromString(CONTRACT_ID)),
    code: '',
    expiryBlock: 1000,
  });

  const snapshotsTaker = new SnapshotsTaker({ chain: 'test' });
  await snapshotsTaker.doJob();
}

async function addVote({ address, ballot, type, blockNumber, txIndex = 0 } = {}) {
  const contract = await contractsDAL.findById(CONTRACT_ID);
  const tx = await txsDAL.create({
    blockNumber,
    index: txIndex,
    version: 0,
    inputCount: 0,
    outputCount: 1,
    hash: faker.random.uuid(),
  });
  const execution = await executionsDAL.create({
    contractId: contract.id,
    blockNumber,
    txId: tx.id,
    command: type == 'payout' ? 'Payout' : 'Allocation',
    messageBody: JSON.stringify({}),
    indexInTx: 0,
  });

  await cgpDAL.create({
    executionId: execution.id,
    blockNumber,
    txHash: tx.hash,
    type,
    ballot,
    address,
  });
}

async function addVoteForAllAddresses({ ballot, type, blockNumber } = {}) {
  for (let i = 0; i < Object.keys(ADDRESS_AMOUNTS).length; i++) {
    const address = Object.keys(ADDRESS_AMOUNTS)[i];
    await addVote({ address, blockNumber, ballot, type });
  }
}
