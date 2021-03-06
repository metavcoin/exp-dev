import React from 'react';
import PropTypes from 'prop-types';
import { Decimal } from 'decimal.js';
import AssetUtils from '../../lib/AssetUtils';
import HashLink from '../HashLink';
import './AssetsBalancesTable.scss';

export default function AssetsBalancesTable({ title, balance = [] }) {
  const _balance = balance.filter((item) => new Decimal(item.total || 0).greaterThan(0));

  return (
    <div className="AssetsBalancesTable">
      <div className="HeadTableContainer">
        <table className="table table-metavcoin">
          <thead>
            <tr>
              <th scope="col" colSpan="2">
                {title}
              </th>
            </tr>
          </thead>
        </table>
      </div>
      <div className="BodyTableContainer">
        <table className="table table-metavcoin">
          <thead>
            <tr>
              <th scope="col">ASSET</th>
              <th scope="col">AMOUNT</th>
            </tr>
          </thead>
          <tbody>
            {_balance.map((assetBalance, index) => (
              <tr key={index}>
                <td>
                  <HashLink
                    hash={assetBalance.metadata ? assetBalance.metadata.shortName : AssetUtils.getAssetNameFromCode(assetBalance.asset)}
                    value={assetBalance.asset}
                    url={`/assets/${assetBalance.asset}`}
                    truncate={!assetBalance.metadata}
                  />
                </td>
                <td>{AssetUtils.getAmountDivided(assetBalance.total)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

AssetsBalancesTable.propTypes = {
  title: PropTypes.any,
  balance: PropTypes.array,
};

AssetsBalancesTable.defaultProps = {
  title: 'BALANCES',
};
