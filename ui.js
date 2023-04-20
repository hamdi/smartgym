/**
 * @license
 * Copyright 2018 Google LLC. All Rights Reserved.
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 * http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 * =============================================================================
 */

export function init() {
  document.getElementById('controller').style.display = '';
  LoadingElement.style.display = 'none';
}

const statusElement = document.getElementById('status');
const pushupsElement = document.getElementById('pushups');

// Set params from UI values.
const sourceElement = document.getElementById('source');
export const getMode = () => +sourceElement.value;

const backendElement = document.getElementById('backend');
export const getBackend = () => +backendElement.value;

const batchSizeFractionElement = document.getElementById('batchSizeFraction');
export const getBatchSizeFraction = () => +batchSizeFractionElement.value;

const LoadingElement = document.getElementById('loadingStatus');

export function isPredicting() {
  LoadingElement.style.visibility = 'visible';
}
export function donePredicting() {
  LoadingElement.style.visibility = 'hidden';
}
export function writeStatus(status) {
  statusElement.innerText = status;
}
export function writePushups(n_pushups) {
  pushupsElement.innerText = n_pushups;
}