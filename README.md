**english** | [русский](https://github.com/yandex-cloud/yfm-transform/blob/master/README.ru.md)
- - -

[![NPM version](https://img.shields.io/npm/v/@doc-tools/transform.svg?style=flat)](https://www.npmjs.org/package/@doc-tools/transform)


A simple transformer of text in YFM (Yandex Flavored Markdown) to HTML.

## Yandex Flavored Markdown

Yandex Flavored Markdown (YFM) is a Markdown dialect that is now used for
[Yandex.Cloud documentation](https://cloud.yandex.com/docs), [Yandex.Cloud website content](https://cloud.yandex.com), and in
a variety of internal Yandex projects.

The syntax is based on the CommonMark Spec, extending it with additional features. It's designed for creating
a full-fledged complex documentation project, such as the Yandex.Cloud documentation.

To build your documentation project in YFM, use the [@doc-tools/docs](https://www.npmjs.com/package/@doc-tools/docs) package.

[Learn more about YFM](https://ydocs.tech)

## Source files

### Installation

```shell script
git clone git@github.com:yandex-cloud/yfm-transform.git
cd yfm-transform
npm install
```

When you add changes to files from the SRC folder, before updating the package version, run

```shell script
npm run dist
```

## License

MIT

