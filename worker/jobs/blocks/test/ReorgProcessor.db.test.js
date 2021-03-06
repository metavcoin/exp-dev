'use strict';

const test = require('blue-tape');
const truncate = require('../../../../test/lib/truncate');
const blocksDAL = require('../../../../server/components/api/blocks/blocksDAL');
const txsDAL = require('../../../../server/components/api/txs/txsDAL');
const outputsDAL = require('../../../../server/components/api/outputs/outputsDAL');
const inputsDAL = require('../../../../server/components/api/inputs/inputsDAL');
const addressesDAL = require('../../../../server/components/api/addresses/addressesDAL');
const assetsDAL = require('../../../../server/components/api/assets/assetsDAL');
const addressTxsDAL = require('../../../../server/components/api/address-txs/addressTxsDAL');
const difficultyPerDayDAL = require('../../../../server/components/api/difficulty-per-day/difficultyPerDayDAL');
const txsPerDayDAL = require('../../../../server/components/api/txs-per-day/txsPerDayDAL');
const zpSupplyPerDayDAL = require('../../../../server/components/api/zp-supply-per-day/zpSupplyPerDayDAL');
const NetworkHelper = require('../../../lib/NetworkHelper');
const ReorgProcessor = require('../ReorgProcessor');
const createDemoBlocksFromTo = require('../../../../test/lib/createDemoBlocksFromTo');

test.onFinish(() => {
  blocksDAL.db.sequelize.close();
});

test('ReorgProcessor.doJob() (DB)', async function (t) {
  await wrapTest('Given no reorg', async (given) => {
    const reorgProcessor = getReorgProcessor();
    // create demo blocks
    await createDemoBlocksFromTo(1, 10);
    const result = await reorgProcessor.doJob();
    t.equal(result.deleted, 0, `${given}: should not delete blocks`);
  });

  await wrapTest('Given a reorg', async (given) => {
    const reorgProcessor = getReorgProcessor();
    // create demo blocks
    const badHash = 'bad';
    await createDemoBlocksFromTo(1, 6, badHash);
    await createDemoBlocksFromTo(7, 10);
    const result = await reorgProcessor.doJob();
    const allBlocks = await blocksDAL.findAll();
    t.equal(result.deleted, 5, `${given}: should delete blocks`);
    t.equal(allBlocks.length, 5, `${given}: database should have 5 blocks left`);
    const hashes = allBlocks.map((block) => block.hash);
    t.assert(!hashes.includes(badHash), `${given}: db should not have the bad hash`);
  });
  await wrapTest('Given a reorg and address balances', async (given) => {
    const address = 'metavcoin1qmwpd6utdzqq4lg52c70f6ae5lpmvcqtm0gvaxqlrvxt79wquf38s9mrydf';
    const reorgProcessor = getReorgProcessor();
    // create demo blocks
    const badHash = 'bad';
    await createDemoBlocksFromTo(1, 6, badHash);
    await createDemoBlocksFromTo(7, 10);
    // add demo txs
    let txBlock6;
    let outputBlock1;
    for (let i = 1; i <= 10; i++) {
      const tx = await txsDAL.create({
        blockNumber: i,
        index: 0,
        hash: 'aaa' + i,
      });
      const output = await outputsDAL.create({
        blockNumber: i,
        txId: tx.id,
        index: 0,
        lockType: 'Coinbase',
        address,
        asset: '00',
        amount: 1,
      });
      await addressTxsDAL.create({
        blockNumber: i,
        txId: tx.id,
        address,
      });
      if (i === 1) {
        outputBlock1 = output;
      }
      if (i === 6) {
        txBlock6 = tx;
      }
    }

    // add addresses data in block 6
    await inputsDAL.create({
      blockNumber: 6,
      txId: txBlock6.id,
      outputId: outputBlock1.id,
      index: 0,
      isMint: false,
      lockType: 'Coinbase',
      address,
      asset: '00',
      amount: 1,
    });

    await addressesDAL.create({
      address,
      asset: '00',
      inputSum: '1',
      outputSum: '10',
      balance: '9',
      txsCount: '2',
    });
    await assetsDAL.create({
      asset: '00',
      issued: '2000045000000000',
      destroyed: '0',
      outstanding: '2000045000000000',
      keyholders: '1',
      txsCount: '10',
    });

    await reorgProcessor.doJob();
    const addressDb = await addressesDAL.findOne({ where: { address, asset: '00' } });
    const assetDb = await assetsDAL.findOne({ where: { asset: '00' } });
    const addressTxsDb = await addressTxsDAL.findAll({ where: { address } });
    t.equal(
      addressDb.balance,
      '5',
      `${given}: should revert the balance to the state before the reorg`
    );
    t.equal(addressTxsDb.length, 5, `${given}: should delete all AddressTxs from the fork`);
    t.assert(
      addressTxsDb.every((a) => a.blockNumber < 6),
      `${given}: should leave AddressTxs before the fork`
    );
    t.equal(
      assetDb.issued,
      '2000020000000000',
      `${given}: should revert asset.issued to the state before the reorg`
    );
    t.equal(
      assetDb.outstanding,
      '2000020000000000',
      `${given}: should revert asset.outstanding to the state before the reorg`
    );
    t.equal(
      assetDb.txsCount,
      '5',
      `${given}: should revert asset.txsCount to the state before the reorg`
    );
  });

  await wrapTest('Given a reorg and charts data', async (given) => {
    const reorgProcessor = getReorgProcessor();
    const badHash = 'bad';
    const fork = 6;

    const blocksData = [];
    const txsPerDayData = [];
    const difficultyPerDayData = [];
    const zpSupplyPerDayData = [];
    for (let i = 1; i <= 10; i++) {
      // 2 blocks a day from 5 days ago until today
      const date = new Date();
      date.setDate(date.getDate() - Math.ceil(i / 2));
      blocksData.push({
        version: 0,
        hash: i === fork ? badHash : String(i),
        parent: String(i - 1),
        blockNumber: i,
        commitments: 'test',
        timestamp: date.valueOf(),
        difficulty: 486539008,
        nonce1: -8412464686019857620,
        nonce2: 25078183,
        reward: i === 1 ? '2000000000000000' : '5000000000',
      });

      // add charts data
      if (i % 2 === 0) {
        txsPerDayData.push({
          date,
          value: 2,
        });
        difficultyPerDayData.push({
          date,
          value: 2,
        });
        zpSupplyPerDayData.push({
          date,
          value: 2,
        });
      }
    }
    await Promise.all([
      blocksDAL.bulkCreate(blocksData),
      txsPerDayDAL.bulkCreate(txsPerDayData),
      difficultyPerDayDAL.bulkCreate(difficultyPerDayData),
      zpSupplyPerDayDAL.bulkCreate(zpSupplyPerDayData),
    ]);

    await reorgProcessor.doJob();
    const lastBlock = await blocksDAL.findLatest();
    const txsPerDay = await txsPerDayDAL.findAll();
    const difficultyPerDay = await difficultyPerDayDAL.findAll();
    const zpSupplyPerDay = await zpSupplyPerDayDAL.findAll();

    const getMaxDate = (max, cur) => max.date > cur.date ? max : cur;
    const expectedDate = new Date(Number(lastBlock.timestamp));
    expectedDate.setDate(expectedDate.getDate() - 1);
    const expectedDateString = expectedDate.toISOString().split('T')[0];

    t.equal(txsPerDay.length, 2, `${given}: should have TxsPerDay up to a day before last valid block`);
    t.equal(difficultyPerDay.length, 2, `${given}: should have DifficultyPerDay up to a day before last valid block`);
    t.equal(zpSupplyPerDay.length, 2, `${given}: should have ZpSupplyPerDay up to a day before last valid block`);
    t.equal(txsPerDay.reduce(getMaxDate).date, expectedDateString , `${given}: last TxsPerDay should have same timestamp as last block`);
    t.equal(difficultyPerDay.reduce(getMaxDate).date, expectedDateString , `${given}: last difficultyPerDay should have same timestamp as last block`);
    t.equal(zpSupplyPerDay.reduce(getMaxDate).date, expectedDateString , `${given}: last zpSupplyPerDay should have same timestamp as last block`);
  });
});

async function wrapTest(given, test) {
  await truncate();
  await test(given);
}

function getReorgProcessor() {
  const networkHelper = new NetworkHelper();
  networkHelper.getBlockFromNode = function (blockNumber) {
    return Promise.resolve({
      hash: String(blockNumber),
      header: {
        parent: String(blockNumber - 1),
      },
    });
  };
  return new ReorgProcessor(networkHelper, '20000000');
}
