
import math

def calculate_units(minutes: int) -> int:
    """
    Calculate time units from minutes.
    1 Unit = 6 Minutes.
    Always round up to the next unit.
    Examples:
        1 min -> 1 unit
        6 min -> 1 unit
        7 min -> 2 units
        12 min -> 2 units
    """
    if minutes <= 0:
        return 0
    return math.ceil(minutes / 6.0)
