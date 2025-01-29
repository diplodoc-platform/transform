import {Tabs} from '@gravity-ui/uikit';

import './header.scss';

function Header({activeTab, items, handleSetInputAreaTabActive}) {
    return (
        <div className="header">
            <div className="wrapper">
                <Tabs
                    className="header__tabs"
                    activeTab={activeTab}
                    items={items}
                    onSelectTab={handleSetInputAreaTabActive}
                    wrapTo={(_item, node) => <div className="header__tab">{node}</div>}
                />
            </div>
        </div>
    );
}

export default Header;
