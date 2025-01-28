import {Card, Tabs, TabsProps, TextArea} from '@gravity-ui/uikit';

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
                    <Card size="m" className="yfm area__yfm">
                        <div
                            dangerouslySetInnerHTML={{__html: output}}
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
