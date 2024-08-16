start main

{% include [Text](included/file-1.md) %}

middle 1

{% include [Text](included/file-2.md) %}

middle 2

{% include [Text](included/file-3.md) %}

end main
{% included (included/file-1.md) %}
start file 1

end file 1
{% endincluded %}
{% included (included/file-2.md) %}
start file 2

end file 2
{% endincluded %}
{% included (included/file-3.md) %}
start file 3

end file 3
{% endincluded %}