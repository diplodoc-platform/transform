start main

[{#T}](./include-link.md)

{% include [Text](./include-link.md) %}

{% include [Text](included/file-1.md) %}

middle 1

{% include [Text](included/file-2.md) %}

end main
{% included (link.md) %}
# Title

Content

{% endincluded %}
{% included (include-link.md) %}
{% include [create-folder](./link.md) %}

{% endincluded %}
{% included (included/file-1.md) %}
start file 1

end file 1
{% endincluded %}
{% included (included/file-2.md) %}
start file 2

end file 2
{% endincluded %}