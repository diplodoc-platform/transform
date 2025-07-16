import type {TabsProps} from '@gravity-ui/uikit';

import {Card, Tabs, TextArea} from '@gravity-ui/uikit';

export type OutputAreaProps = {
    handleSelectTab: (active: string) => void;
    tabItems: TabsProps['items'];
    tabActive: string;

    handleInputChange?: (input: string) => void;
    output: string;
};

export function OutputArea(props: OutputAreaProps) {
    const {
        output,
        tabItems,
        tabActive,
        handleSelectTab,
        handleInputChange = () => undefined,
    } = props;

    return (
        <div className="output">
            <div>
                <Tabs
                    onSelectTab={handleSelectTab}
                    activeTab={tabActive}
                    items={tabItems}
                    className="area__tabs"
                />
            </div>
            <div>
                {tabActive === 'preview' ? (
                    <Card size="m" className="dc-doc-page area__yfm">
                        <div
                            dangerouslySetInnerHTML={{
                                __html: `
                                <div class="yfm">${output}</div>    
                            `,
                            }}
                            className="area__card"
                        ></div>
                    </Card>
                ) : (
                    <TextArea onUpdate={handleInputChange} value={output} size="l" />
                )}
            </div>
        </div>
    );
}
