**русский** | [english](https://github.com/yandex-cloud/yfm-transform/blob/master/README.md)
- - -

[![NPM version](https://img.shields.io/npm/v/@doc-tools/transform.svg?style=flat)](https://www.npmjs.org/package/@doc-tools/transform)

Простой трансформер текста на YFM (Yandex Flavored Markdown) в HTML.

## Yandex Flavored Markdown

Yandex Flavored Markdown (YFM) является диалектом Markdown, который используется сейчас для
[документации Яндекс.Облака](https://cloud.yandex.ru/docs), [контента сайта Я.Облака](https://cloud.yandex.ru) и в
различных внутренних проектах Яндекса.

Синтаксис базируется на CommonMark Spec, расширяя его дополнительными возможностями. В том числе, для создания
полноценного сложного документационного проекта, такого как документация Яндекс.Облака.

Для сборки своего документационного проекта на YFM вы можете использовать пакет [@doc-tools/docs](https://www.npmjs.com/package/@doc-tools/docs).

[Более подробное описание YFM](https://ydocs.tech)

## Исходники
### Установка
```shell script
git clone git@github.com:yandex-cloud/yfm-transform.git
cd yfm-transform
npm install
```

При добавлении изменений в файлы из директории src перед обновлением версии пакета нужно выполнить
```shell script
npm run dist
```

## License

MIT
