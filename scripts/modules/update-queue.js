/** 
 * Helper class to manage database updates that occur from
 * hooks that may fire back to back.
 */
class UpdateQueue {
  constructor(entityType) {

    /** self identification */
    this.entityType = entityType;

    /** buffer of update functions to run */
    this.queue = [];

    /** Semaphore for 'batch update in progress' */
    this.inFlight = false;
  }

  queueUpdate(fn) {
    this.queue.push(fn);

    /** only kick off a batch of updates if none are in flight */
    if (!this.inFlight) {
      this.runUpdate();
    }
  }

  async runUpdate(){

    this.inFlight = true;

    while(this.queue.length > 0) {


      /** grab the last update in the list and hold onto its index
       *  in case another update pushes onto this array before we
       *  are finished.
       */
      const updateIndex = this.queue.length-1;
      const updateFn = this.queue[updateIndex];

      try {
      /** wait for the update to complete */
        await updateFn();
      } catch (e) {
        logger.error(e);
      } finally {
        /** remove this entry from the queue */
        this.queue.splice(updateIndex,1);
      }
    }

    this.inFlight = false;

  }
}

let updateQueue = new UpdateQueue("All");

/** 
 * Safely manages concurrent updates to the provided entity type
 * @param {Function} updateFn   the function that handles the actual update (can be async)
 */
export function queueUpdate(updateFn) {
  /** queue the update for this entity */
  updateQueue.queueUpdate(updateFn);
}
