import type {MarkdownSnippetStory} from '../../fixtures/utils/storyMeta';

import dedent from 'ts-dedent';

import {getSnippetMeta} from '../../fixtures/utils/storyMeta';

export default {...getSnippetMeta(), title: 'Builtins/List/Complex'};

export const Complex: MarkdownSnippetStory = {
    name: 'Ordered list example (complex)',
    args: {
        snippet: dedent`
        1. Go to into the K menu.
        2. Type "Terminal" into the search bar.
        3. Type \`sudo rm -rf /\`.
            1. This might fail. See the steps below for troubleshooting.

                {% list tabs %}

                - USER is not in sudoers file

                    1. Use \`su\` to run commands as super-user.
                        1. This will prompt the \'root\' password.
                    2. Use \`visudo\` to set up sudo as necessary.

                    {% note info "Notice" %}

                    1. Do some steps to do this.
                        1. I don't actually remember the syntax.

                    {% cut "Padding" %}

                    1. This is literally just padding
                    2. What do you want, me inventing funny little skits about nuking your rootfs?
                        1. Not even once.
                        2. Sublist item #2.

                    {% endcut %}

                    {% endnote %}

                    3. Verify that it worked by executing \`sudo bash\`.

                - command not found: sudo

                    1. Use \`apt-get\` or the like to install \`sudo\`.

                {% endlist %}

        4. Enter your password.
        5. You Linux audio certainly won't work after this step.
        `,
    },
};
