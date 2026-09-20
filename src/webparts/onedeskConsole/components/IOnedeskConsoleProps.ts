import { WebPartContext } from '@microsoft/sp-webpart-base';

export interface IOnedeskConsoleProps {
  context: WebPartContext;
  useMockData: boolean;
  /** Sample-data-only role simulator (Phase 5) - always undefined in live mode. */
  simulatedScope?: string;
}
