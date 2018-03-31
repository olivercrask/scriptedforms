// Scripted Forms -- Making GUIs easy for everyone on your team.
// Copyright (C) 2017 Simon Biggs

// This program is free software: you can redistribute it and/or modify
// it under the terms of the GNU Affero General Public License as published
// by the Free Software Foundation, either version 3 of the License, or
// (at your option) any later version (the "AGPL-3.0+").

// This program is distributed in the hope that it will be useful,
// but WITHOUT ANY WARRANTY; without even the implied warranty of
// MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE. See the
// GNU Affero General Public License and the additional terms for more
// details.

// You should have received a copy of the GNU Affero General Public License
// along with this program. If not, see <http://www.gnu.org/licenses/>.

// ADDITIONAL TERMS are also included as allowed by Section 7 of the GNU
// Affrero General Public License. These aditional terms are Sections 1, 5,
// 6, 7, 8, and 9 from the Apache License, Version 2.0 (the "Apache-2.0")
// where all references to the definition "License" are instead defined to
// mean the AGPL-3.0+.

// You should have received a copy of the Apache-2.0 along with this
// program. If not, see <http://www.apache.org/licenses/LICENSE-2.0>.

// import { BehaviorSubject } from 'rxjs';

import {
  Component, AfterViewInit, Input, ViewChild
} from '@angular/core';

import {
  MatTableDataSource
} from '@angular/material';

import * as  stringify from 'json-stable-stringify';

import { VariableBaseComponent } from './variable-base.component';
import { PandasTable } from '../interfaces/pandas-table';

import { VariableParameterComponent } from './variable-parameter.component';

@Component({
  selector: 'variable-table',
  templateUrl: 'variable-table.component.html',
styles: [
`
.container {
  display: flex;
  flex-direction: column;
  min-width: 300px;
}

.mat-form-field {
  width: 100%;
}
`]
})
export class VariableTableComponent extends VariableBaseComponent implements AfterViewInit {
  @Input() typeEdit?: string = null;
  @Input() typeLock?: string;
  @Input() dropdownItems?: string;

  @ViewChild('variableTypeLock') variableTypeLock: VariableParameterComponent;
  @ViewChild('variableDropdownItems') variableDropdownItems: VariableParameterComponent;

  availableTypes = ['string', 'number', 'integer', 'boolean'];
  types: string[] = [];
  columnDefs: string[] = [];
  oldColumnDefs: string[] = [];
  dataSource: MatTableDataSource<{
    [key: string]: string | number
  }> = new MatTableDataSource();

  variableValue: PandasTable;
  oldVariableValue: PandasTable;
  isPandas = true;
  focus: [number, string] = [null, null];

  updateVariableView(value: PandasTable) {
    console.log(value);

    let numRowsUnchanged: boolean;
    if (this.variableValue) {
      numRowsUnchanged = (
        value.data.length === this.variableValue.data.length
      );
    } else {
      numRowsUnchanged = false;
    }
    this.variableValue = value;

    const columns: string[] = [];
    const types: string[] = [];
    value.schema.fields.forEach(field => {
      columns.push(field.name);
      if (this.availableTypes.includes(field.type)) {
        types.push(field.type);
      } else {
        types.push('string');
      }
    });
    this.oldColumnDefs = this.columnDefs;
    this.columnDefs = columns;
    this.types = types;

    const columnsUnchanged = (
      this.oldColumnDefs.length === this.columnDefs.length &&
      this.columnDefs.every(
        (item, index) =>  item === this.oldColumnDefs[index])
    );

    if (columnsUnchanged && numRowsUnchanged) {
      types.forEach((type, index) => {
        if (this.oldVariableValue.schema.fields[index].type !== type) {
          this.oldVariableValue.schema.fields[index].type = type;
        }
      });
      value.data.forEach((row, i) => {
        const keys = Object.keys(row);
        keys.forEach((key, j) => {
          if ((i !== this.focus[0]) || (key !== this.focus[1])) {
            if (this.oldVariableValue.data[i][key] !== row[key]) {
              this.dataSource.data[i][key] = row[key];
              this.oldVariableValue.data[i][key] = row[key];
            }
          }
        });
      });
    } else {
      this.dataSource.data = value.data;
      this.updateOldVariable();
    }
  }

  dataChanged() {
    this.variableValue.data = JSON.parse(JSON.stringify(this.dataSource.data));
    this.variableChanged();
  }

  typesChanged() {
    let didDataChange = false;
    this.variableValue.schema.fields.forEach((field, index) => {
      if (this.oldVariableValue.schema.fields[index].type === 'boolean' && this.types[index] === 'string') {
        this.dataSource.data.forEach(row => {
          row[this.columnDefs[index]] = '';
          didDataChange = true;
        });
      }
      field.type = this.types[index];
    });
    if (didDataChange) {
      this.variableValue.data = JSON.parse(JSON.stringify(this.dataSource.data));
    }
    this.variableChanged();
  }

  testIfDifferent() {
    return !(stringify(this.variableValue) === stringify(this.oldVariableValue));
  }

  pythonValueReference() {
    return `_json_table_to_df(r'${JSON.stringify(this.variableValue)}')`;
  }

  pythonVariableEvaluate() {
    return `json.loads(${this.variableName}.to_json(orient='table'))`;
  }

  onBlur(tableCoords: [number, string]) {
    this.focus = [null, null];
  }

  onFocus(tableCoords: [number, string]) {
    this.focus = tableCoords;
  }
}
