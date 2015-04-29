## Yet another desktop application for Remember The Milk service built with Adobe AIR ##
### Major features ###
  * Task display and management
  * Quick task add with powerful syntax
  * Task execution time tracking
  * Work/rest time tracking
Comments and suggestions are welcome to **kvorobyev at gmail.com**

For a complete list of features with screenshots see below:
![http://rtm-air-desktop.googlecode.com/files/main_screen.png](http://rtm-air-desktop.googlecode.com/files/main_screen.png)
  * Works under Windows, MacOSX, Linux, Adobe AIR runtime is the only one requirement
  * Main window displays task names with other info from selected list
  * Complete task with one click or shortcut
  * Switch between lists from drop-down toolbar menu
  * Server-based task search with all RTM search keywords and features (icon in top-right corner)
  * Search results can be saved as new smart list
  * Quick task add field with powerful syntax. Following line is recognized correctly: **Pickup milk today every week #food #money @Home ~30 min** where _today_ - due date, _every week_ - recurrence pattern, _food_, _money_ - tags, _Home_ - location, _30 min_ - estimate time
  * All quick task add patterns:
    * _today, Monday, 8/9_ etc. sets due date, parsed by RTM service
    * _every ..._, _after ..._ defines recurrence pattern, parsed by RTM service
    * _#tag_ defines tag for task
    * _@Location_ sets location for task. If you are lazy guy, put only first few characters, YaR Desktop is smart enough to find location
    * _>List_ defines list to save task to. If you lazy, do same as for location
    * _~10 min_, _~1hr 30 min_ - estimate time for task
![http://rtm-air-desktop.googlecode.com/files/settings.png](http://rtm-air-desktop.googlecode.com/files/settings.png)
### Track work/rest time ###
We all, who spend most of the day working on computer, need to take small breaks. YaR Desktop can track your working time and indicate moments to take some rest, drink a coffee or tea and walk around
  * Setup desired work and rest periods length on settings screen. Best time for me is 40 minutes of work and 5 minutes of rest
  * Now progress bar on the bottom displays current amount of work/rest time passed and blinks when it's recommended to you to start/stop working
  * If you need to take a rest or begin to work immediately, double click on progress bar to change mode
### Task execution time tracking ###
Double click on task to open floating window with currently executing task to start tracking. For more information see below

![http://rtm-air-desktop.googlecode.com/files/float_win.png](http://rtm-air-desktop.googlecode.com/files/float_win.png)
  * Push _Pause_ button to start/stop timer
  * If you need to manually change timer value, push _Edit_ button
  * Expand/collapse right panel for notes viewing and management
  * By normal, only one task is executed at one time and task is paused when you close floating window. To change this behavior, push _Background_ button on the right of button panel to make task executed in background independently from other tasks
  * When task is completed timer value is saved according to settings (as new note and/or _estimate time_ field overwrite)
  * Scroll mouse wheel up and down over floating window to change window opacity

### Task management ###
Following task fields can be edited from _Edit_ menu or by keyboard shortcut (shortcuts are taken from RTM web client):
![http://rtm-air-desktop.googlecode.com/files/edit_menu.png](http://rtm-air-desktop.googlecode.com/files/edit_menu.png)
  * Task name (shortcut: **r**)
  * List
  * Tags (shortcut: **s**)
  * Location (shortcut: **l**)
  * Recurrence pattern (shortcut: **f**)
  * Due date (shortcut: **d**)
  * Estimate time (shortcut: **g**)
  * Priority (shortcuts: **1** - Top, **2** - Middle, **3** - Low, **4** - No priority)
Also, task can be:
  * Completed (shortcut: **c**)
  * Postponed (shortcut: **p**)
  * Deleted (shortcut: **Del**)
![http://rtm-air-desktop.googlecode.com/files/edit_dialog.png](http://rtm-air-desktop.googlecode.com/files/edit_dialog.png)

_This product uses the Remember The Milk API but is not endorsed or certified by Remember The Milk._