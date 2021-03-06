package org.rhq.metrics.client.common;

import java.util.Iterator;
import java.util.List;

/**
 * Just a helper
 * @author Heiko W. Rupp
 */
public abstract class Batcher {

    /**
     * Translate the passed list of metrics into a JSON representation
     * @param metrics a List of metrics to translate
     * @return String as JSON representation of the Metrics.
     */
    public static  String metricListToJson(List<SingleMetric> metrics) {
            StringBuilder builder = new StringBuilder("[");
            Iterator<SingleMetric> iter = metrics.iterator();
            while (iter.hasNext()) {
                SingleMetric event = iter.next();
                builder.append(event.toJson());
                if (iter.hasNext()) {
                    builder.append(',');
                }
            }
            builder.append(']');

            return builder.toString();
        }

}
