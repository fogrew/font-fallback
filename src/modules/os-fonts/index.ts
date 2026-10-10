export { osFontsDataset } from './lib/dataset';
export {
  type Availability,
  CATEGORIES,
  type Category,
  OS_IDS,
  type OsFont,
  type OsFontsDataset,
  type OsId,
  type Platform,
  STATUSES,
  type Status,
} from './lib/model';
export {
  fontsAvailableOn,
  type OsAvailability,
  type OsAvailabilityResult,
  osAvailability,
} from './lib/query';
export { assertDataset, validateDataset } from './lib/validate';
