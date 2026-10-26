"""Builds live_dispatch_due/fn*.py: the planned-date-free functions (live_psd_removed/) plus the Dispatch Due block."""
import os
import sys
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import dispatch_due_block as B
H = os.path.dirname(os.path.abspath(__file__))
EU_RETAIL = "def order_import(order_data):\n    # EU retail (dockandbay-eu): Dispatch Due only. Created 22-Oct-26 (Ben), planned date removed 27-Oct-26.\n\n    return order_data\n"
for fn, cfg in B.CONFIGS.items():
    base = EU_RETAIL if fn == 49 else open(os.path.join(H, f"live_psd_removed/fn{fn}.py")).read()
    open(os.path.join(H, f"live_dispatch_due/fn{fn}.py"), "w").write(B.inject(base, cfg))
    print("built", fn)
