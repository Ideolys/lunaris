# Lunaris

## 1.3.0

- Fix :
  + When we rollback a GET action, an error was thrown because of no given data. However, a failed GET action do not have such data. The rollback method do not longer expect data for GET actions.

- Features :
