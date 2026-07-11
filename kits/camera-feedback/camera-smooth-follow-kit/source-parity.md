# Source Parity

Initial behavior was extracted from the PrehistoricRush third-person camera requirement at commit `e7f00ba3781cd78fff3350c4a3e336911e6db1d9`.

The candidate generalizes the game-specific camera pass into renderer-agnostic state:

- damped follow position
- damped look point
- damped quaternion
- capped camera timestep
- explicit restart and teleport resets

PrehistoricRush remains the first renderer integration proof.
