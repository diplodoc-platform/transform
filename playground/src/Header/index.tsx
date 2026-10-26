import {Tabs} from '@gravity-ui/uikit/legacy';

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
                    wrapTo={(item, node) => (
                        <div key={item.id} className="header__tab">
                            {node}
                        </div>
                    )}
                />
            </div>
        </div>
    );
}

export default Header;
