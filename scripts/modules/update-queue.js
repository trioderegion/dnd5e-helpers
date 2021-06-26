/*
 * MIT License
 * 
 * Copyright (c) 2021 DnD5e Helpers Team
 * 
 * Permission is hereby granted, free of charge, to any person obtaining a copy
 * of this software and associated documentation files (the "Software"), to deal
 * in the Software without restriction, including without limitation the rights
 * to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
 * copies of the Software, and to permit persons to whom the Software is
 * furnished to do so, subject to the following conditions:
 * 
 * The above copyright notice and this permission notice shall be included in all
 * copies or substantial portions of the Software.
 * 
 * THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
 * IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
 * FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
 * AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
 * LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
 * OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
 * SOFTWARE.
 */

let updateQueues = new Map();

/** 
 * Safely manages concurrent updates to the provided entity type
 * @param {String} entity       the name of the entity type, ex. 'Combat' or 'Scene'
 * @param {Function} updateFn   the function that handles the actual update (can be async)
 */
export function queueEntityUpdate(entity, updateFn) {

  /** if this is a new entity type, create the queue object to manage it */
  if(!updateQueues.has(entity)) {
    updateQueues.set(entity, new UpdateQueue(entity));
  }

  /** queue the update for this entity */
  updateQueues.get(entity).queueUpdate(updateFn);
}

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

      /** wait for the update to complete */
      await updateFn();

      /** remove this entry from the queue */
      this.queue.splice(updateIndex,1);
    }

    this.inFlight = false;

  }
}
