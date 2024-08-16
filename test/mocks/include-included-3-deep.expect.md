start main

{% include [Text](included/file-1-deep.md) %}

end main
{% included (included/file-1-deep.md) %}
start file 1

{% include [Text](file-2-deep.md) %}

end file 1
{% included (included/file-2-deep.md) %}
start file 2

{% include [Text](file-3.md) %}

end file 2
{% included (included/file-3.md) %}
start file 3

end file 3
{% endincluded %}
{% endincluded %}
{% endincluded %}