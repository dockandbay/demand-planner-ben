-- 263: FAITHFUL backfill of per-product components from the legacy aspect model.
-- For every product that has size dimensions today, create one component per distinct aspect it uses
-- (product / packaging / labels / polybag / other), named for the aspect and linked back to it via `dimension`.
-- The component then surfaces that aspect's existing approval + files (server reads them by `dimension`) so
-- nothing is lost when the Components tab becomes the home of a product's development. Net-new catalogue
-- components (dimension IS NULL) are unaffected. Idempotent — re-running adds nothing (UNIQUE(item_ref,name)).
--
-- supplier stays NULL = "the product's main supplier" (retarget per component afterwards, e.g. Packaging -> MQ Print).

INSERT INTO planner.product_dev_components (item_ref, name, dimension, supplier, sampling_mode, sort)
SELECT i.ref,
       CASE sd.dimension
         WHEN 'product'   THEN 'Product'
         WHEN 'packaging' THEN 'Packaging'
         WHEN 'labels'    THEN 'Labels/wraps'
         WHEN 'polybag'   THEN 'Polybags'
         WHEN 'other'     THEN 'Other components'
         ELSE initcap(sd.dimension)
       END                                                    AS name,
       sd.dimension,
       NULL                                                   AS supplier,
       CASE WHEN sd.dimension = 'polybag' THEN 'spec_linked' ELSE 'sampled' END AS sampling_mode,
       CASE sd.dimension
         WHEN 'product'   THEN 1
         WHEN 'packaging' THEN 2
         WHEN 'labels'    THEN 3
         WHEN 'polybag'   THEN 4
         WHEN 'other'     THEN 5
         ELSE 9
       END                                                    AS sort
FROM planner.product_dev_size_dimensions sd
JOIN planner.product_dev_sizes s ON s.id = sd.size_id
JOIN planner.product_dev_items i ON i.id = s.item_id
GROUP BY i.ref, sd.dimension
ON CONFLICT (item_ref, name) DO NOTHING;
