const Service = require('../../server/lib/Service');
const NetworkError = require('../../server/lib/NetworkError');

class NetworkHelper {
  async getLatestBlockNumberFromNode() {
    const info = await Service.blocks.getChainInfo();
    if (!info.blocks) {
      throw new NetworkError(null, 'Chain info does not contain a blocks key');
    }
    return info.blocks;
  }

  async getBlockFromNode(blockNumber) {
    return await Service.blocks.getBlock(blockNumber);
  }

  /**
   * Get blocks in a batch from /blockchain/block
   * calls the api *take* times in parallel
   */
  async getBlocksFromNode({ blockNumber, take } = {}) {
    // get all blocks in batch
    // BLOCKS ARE ORDERED HIGH TO LOW
    const nodeBlocksPromises = [];
    for (let i = blockNumber; i > blockNumber - take; i--) {
      nodeBlocksPromises.push(
        this.getBlockFromNode(i).then((block) =>
          Object.assign(block, {
            blockNumber: block.header.blockNumber,
          })
        )
      );
    }

    return Promise.all(nodeBlocksPromises);
  }
  /**
   * Get serialized blocks in a batch from blockchain/blocks
   */
  async getSerializedBlocksFromNode({ blockNumber, take } = {}) {
    return Service.blocks.getBlocks({ blockNumber, take });
  }

  async getBlockchainInfo() {
    return await Service.blocks.getChainInfo();
  }

  async getActiveContractsFromNode() {
    return await Service.contracts.getActiveContracts();
  }

  async getContractExecutionsFromNode(data) {
    return await Service.contracts.getExecutions(data);
  }

  async getmetavcoinNodeLatestTag() {
    const release = await Service.metavcoin.getmetavcoinNodeLatestRelease();
    return release ? release.tag_name : 'v0.9';
  }

  async getDesktopWalletVersion() {
    const release = await Service.metavcoin.getDesktopWalletVersion();
    return release ? 'v' + release : 'v0.2';
  }
}
module.exports = NetworkHelper;
