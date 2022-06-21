# YFM File plugin

```md
{% file src="path/to/file" name='readme.md' %}

==>

<a href="path/to/file" download="readme.md" class="yfm-file"><span class="yfm-file__icon"></span>readme.md</a>
```

## Attributes

|Name|Required|Description|
|---|---|---|
|`src`|yes|URL of the file. Will be mapped to [`href` attribute](https://developer.mozilla.org/en-US/docs/Web/HTML/Element/a#attr-href)|
|`name`|yes|Name of the file. Will be mapped to [`download` attribute](https://developer.mozilla.org/en-US/docs/Web/HTML/Element/a#attr-download)|
|`lang`|-|Language of the file content. Will be mapped to [`hreflang` attribute](https://developer.mozilla.org/en-US/docs/Web/HTML/Element/a#attr-hreflang)|
|`referrerpolicy`|-|[`referrerpolicy` attribute](https://developer.mozilla.org/en-US/docs/Web/HTML/Element/a#attr-referrerpolicy)|
|`rel`|-|[`rel` attribute](https://developer.mozilla.org/en-US/docs/Web/HTML/Element/a#attr-rel)|
|`target`|-|[`target` attribute](https://developer.mozilla.org/en-US/docs/Web/HTML/Element/a#attr-target)|
|`type`|-|[`type` attribute](https://developer.mozilla.org/en-US/docs/Web/HTML/Element/a#attr-type)|

> _Note: other attributes will be ignored_

## Plugin options

|Name|Type|Description|
|---|---|---|
|`fileExtraAttrs`|`[string, string][]`|Adds additional attributes to rendered hyperlink|

## CSS public variables

* `--yfm-file-icon` – sets custom file icon image
* `--yfm-file-icon-color` – sets custom file icon color
