import React from 'react';
import { observer, inject } from 'mobx-react';
import Config from '../../lib/Config';
import Logo from '../Logo';
import ExternalLink from '../ExternalLink';
import SyncNotification from '../SyncNotification';
import './Footer.scss';

export default function Footer() {
  return (
    <footer className="Footer container">
      <div className="row row-logo">
        <div className="col-12 px-0">
          <Logo />
          <SyncNotification />
        </div>
      </div>
      <div className="row">
        <div className="col-lg-8 border-dark separator">
          <FooterLinks />
        </div>
        <div className="FooterSocialContact col-lg-4 d-flex flex-column">
          <FooterSocial />
          <FooterContact />
        </div>
      </div>
    </footer>
  );
}

const FooterLinks = inject('rootStore')(
  observer(props => {
    const { infoStore } = props.rootStore;
    return (
      <div className="FooterLinks">
        <div className="">
          <ul className="nav flex-column">
            {/* <li className="nav-item">
              <Link className="nav-link text-nowrap" to="/broadcastTx">
                Broadcast Raw Tx
              </Link>
            </li>
            <li className="nav-item">
              <Link className="nav-link text-nowrap" to="/oracle">
                Oracle
              </Link>
            </li>
            <li className="nav-item">
              <Link className="nav-link text-nowrap" to="/templates/contract">Contract templates</Link>
            </li> */}
            <li className="nav-item">
              <ExternalLink
                className="nav-link text-nowrap"
                url="https://www.metavcoin.com/en/faq"
              >
                Learn more
              </ExternalLink>
            </li>
          </ul>
        </div>
        <div className="">
          <ul className="nav flex-column">
            <li className="nav-item">
              <ExternalLink className="nav-link text-nowrap" url="https://docs.metavcoin.com/">
                Documentation
              </ExternalLink>
            </li>
            <li className="nav-item">
              <ExternalLink className="nav-link text-nowrap" url="https://wallet.zp.io/">
                Wallet
              </ExternalLink>
            </li>
            <li className="nav-item">
              {infoStore.isTestnet ? (
                <ExternalLink className="nav-link text-nowrap" url="https://zp.io">
                  Mainnet
                </ExternalLink>
              ) : (
                <ExternalLink className="nav-link text-nowrap" url="https://testnet.zp.io">
                  Testnet
                </ExternalLink>
              )}
            </li>
          </ul>
        </div>
        <div className="">
          <ul className="nav flex-column">
            <li className="nav-item">
              <ExternalLink className="nav-link text-nowrap" url="https://forum.metavcoin.com/">
                Forum
              </ExternalLink>
            </li>
            <li className="nav-item">
              <ExternalLink
                className="nav-link text-nowrap"
                url={`mailto:${Config.constants.metavcoinInfoMail}`}
                target="_top"
              >
                Contact Us
              </ExternalLink>
            </li>
            <li className="nav-item">
              <ExternalLink
                className="nav-link text-nowrap"
                url="https://www.metavcoin.com/privacy?locale=en"
              >
                Privacy Policy
              </ExternalLink>
            </li>
            <li className="nav-item">
              <ExternalLink
                className="nav-link text-nowrap"
                url="https://www.metavcoin.com/legal/metavcoin_chain_token_sale_agreement.pdf"
              >
                Terms of Service
              </ExternalLink>
            </li>
          </ul>
        </div>
      </div>
    );
  })
);

function FooterContact() {
  return (
    <ul className="nav flex-column">
      <li className="nav-item text-nowrap">
        <span className="nav-link">
          Contact us:{' '}
          <ExternalLink
            className=" pl-0 d-inline-block"
            target="_top"
            url={`mailto:${Config.constants.metavcoinInfoMail}`}
          >
            {Config.constants.metavcoinInfoMail}
          </ExternalLink>
        </span>
      </li>
    </ul>
  );
}

function FooterSocial() {
  return (
    <ul className="FooterSocial nav">
      <li className="nav-item">
        <ExternalLink className="nav-link telegram-icon" url="https://t.me/metavcoin/">
          <i className="fab fa-telegram-plane" />
        </ExternalLink>
      </li>
      <li className="nav-item">
        <ExternalLink className="nav-link github-icon" url="https://github.com/metavcoin">
          <i className="fab fa-github" />
        </ExternalLink>
      </li>
      <li className="nav-item">
        <ExternalLink className="nav-link medium-icon" url="https://blog.metavcoin.com/">
          <i className="fab fa-medium-m" />
        </ExternalLink>
      </li>
      <li className="nav-item">
        <ExternalLink className="nav-link twitter-icon" url="https://twitter.com/metavcoin_chain">
          <i className="fab fa-twitter" />
        </ExternalLink>
      </li>
      <li className="nav-item">
        <ExternalLink
          className="nav-link youtube-icon"
          url="https://www.youtube.com/channel/UCVm4j3TrmD8mSvvExG_CAIw"
        >
          <i className="fab fa-youtube" />
        </ExternalLink>
      </li>
      <li className="nav-item">
        <ExternalLink className="nav-link discourse-icon" url="https://forum.metavcoin.com">
          <i className="fab fa-discourse" />
        </ExternalLink>
      </li>
    </ul>
  );
}
