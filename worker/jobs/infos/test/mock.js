module.exports = {
  mockNetworkHelper(networkHelper) {
    networkHelper.getmetavcoinNodeLatestTag = async function() {
      return 'v0.9.123';
    };
    networkHelper.getDesktopWalletVersion = async function() {
      return 'v0.9.456';
    };
    networkHelper.getBlockchainInfo = async function() {
      return {};
    };
  },
};
