import * as React from 'react';
import * as ReactDom from 'react-dom';
import { Version } from '@microsoft/sp-core-library';
import { type IPropertyPaneConfiguration, type IPropertyPaneField, PropertyPaneToggle, PropertyPaneDropdown } from '@microsoft/sp-property-pane';
import { BaseClientSideWebPart } from '@microsoft/sp-webpart-base';

import * as strings from 'OnedeskConsoleWebPartStrings';
import OnedeskConsole from './components/OnedeskConsole';
import { IOnedeskConsoleProps } from './components/IOnedeskConsoleProps';
import { USER_SCOPE } from './services/config';

export interface IOnedeskConsoleWebPartProps {
  useMockData: boolean;
  /** Only ever read when useMockData is on - see render(). '' means "don't simulate, use the real lookup". */
  simulatedScope: string;
}

export default class OnedeskConsoleWebPart extends BaseClientSideWebPart<IOnedeskConsoleWebPartProps> {

  public render(): void {
    // Phase 2 (build_plan.md) - real service layer (SharePointDataService /
    // MockDataService) behind the useMockData property pane toggle, chosen
    // inside OnedeskConsole itself via React.useMemo.
    const useMockData = !!this.properties.useMockData;
    const props: IOnedeskConsoleProps = {
      context: this.context,
      useMockData,
      // Gated here, not just disabled in the property pane, so a
      // simulated role saved on the page can never leak into live mode.
      simulatedScope: useMockData ? this.properties.simulatedScope || undefined : undefined,
    };

    const element = React.createElement(OnedeskConsole, props);
    ReactDom.render(element, this.domElement);
  }

  protected onDispose(): void {
    ReactDom.unmountComponentAtNode(this.domElement);
  }

  protected get dataVersion(): Version {
    return Version.parse('1.0');
  }

  protected onPropertyPaneFieldChanged(propertyPath: string): void {
    // The role simulator only makes sense in sample-data mode - refresh so
    // it appears/disappears immediately when the toggle changes.
    if (propertyPath === 'useMockData') {
      this.context.propertyPane.refresh();
    }
  }

  protected getPropertyPaneConfiguration(): IPropertyPaneConfiguration {
    const groupFields: IPropertyPaneField<unknown>[] = [
      PropertyPaneToggle('useMockData', {
        label: 'Use sample data (ignore live SharePoint)',
        onText: 'Sample data',
        offText: 'Live SharePoint'
      })
    ];

    if (this.properties.useMockData) {
      groupFields.push(
        PropertyPaneDropdown('simulatedScope', {
          label: 'Simulate role (sample data only)',
          options: [
            { key: '', text: 'Real (use my actual access)' },
            { key: USER_SCOPE.USER, text: 'Employee' },
            { key: USER_SCOPE.IT, text: 'Staff (IT)' },
            { key: USER_SCOPE.SUPER_ADMIN, text: 'Super Admin' }
          ]
        })
      );
    }

    return {
      pages: [
        {
          header: {
            description: strings.PropertyPaneDescription
          },
          groups: [
            {
              groupName: strings.BasicGroupName,
              groupFields
            }
          ]
        }
      ]
    };
  }
}
