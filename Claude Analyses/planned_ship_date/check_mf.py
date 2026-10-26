import sys, os
H = os.path.dirname(os.path.abspath(__file__)); sys.path.insert(0, os.path.join(H, "../pp_bom_flip"))
from pp_bom_flip import Fulfil
f = Fulfil("live", False)
for r in f.search_read("metafield.field", [], ["id", "code", "name"]): print(r)
