package org.rhq.metrics.client.common;

/**
 * One single metric
 *
 * @author Heiko W. Rupp
 */
public class SingleMetric {

    private MetricType metricType;

    String jsonTemplate = "{\"id\":\"%1\"," +
     "\"timestamp\":%2,"+
     "\"value\":%3}";


    private long timestamp;
    private String source;
    private Double value;

    public SingleMetric() {
    }

    public SingleMetric(String source, long timestamp, Double value) {
        this.timestamp = timestamp;
        this.source = source;
        this.value = value;
    }

    public long getTimestamp() {
        return timestamp;
    }

    public String getSource() {
        return source;
    }

    public Double getValue() {
        return value;
    }

    @Override
    public String toString() {
        return "SingleMetric{" +
            "type=" + metricType +
            ", time=" + timestamp +
            ", src='" + source + '\'' +
            ", val=" + value +
            '}';
    }

    public String toJson() {
        String payload = jsonTemplate.replaceAll("%1",source)
            .replaceAll("%2", String.valueOf(timestamp))
            .replaceAll("%3", String.valueOf(value));

        return payload;

    }

    public MetricType getMetricType() {
        return metricType;
    }

    public void setMetricType(MetricType metricType) {
        this.metricType = metricType;
    }
}
