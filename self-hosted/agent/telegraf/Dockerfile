FROM arm32v7/telegraf:1.14

COPY ./telegraf.conf /etc/telegraf/telegraf.conf

ENTRYPOINT ["/entrypoint.sh"]
CMD ["telegraf"]
