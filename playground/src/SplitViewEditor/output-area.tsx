import type {TabsProps} from '@gravity-ui/uikit';

import {Card, Tabs, TextArea} from '@gravity-ui/uikit';
import {THEME, useThemeApp} from 'src/context/theme';

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

    const {themeType} = useThemeApp();

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
                    <div className={THEME[themeType]}>
                        <Card size="m" className="yfm area__yfm">
                            <div
                                dangerouslySetInnerHTML={{
                                    __html: output,
                                }}
                                className="area__card"
                            />
                        </Card>
                    </div>
                ) : (
                    <TextArea onUpdate={handleInputChange} value={output} size="l" />
                )}
            </div>
        </div>
    );
}
