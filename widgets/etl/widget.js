import React from 'react';
import Form from 'laboratory/form';

import Container from 'gadgets/container/widget';
import Label from 'gadgets/label/widget';
import Button from 'gadgets/button/widget';
import Field from 'gadgets/field/widget';
import Table from 'gadgets/table/widget';

class Etl extends Form {
  constructor () {
    super (...arguments);
    this.runPreview = this.runPreview.bind (this);
    this.addMap = this.addMap.bind (this);
    this.run = this.run.bind (this);
  }

  static get wiring () {
    return {
      id: 'id',
    };
  }

  addMap () {
    this.do ('map-column-to-param', {
      fromColumn: this.getFormValue ('.fromColumn'),
      toParam: this.getFormValue ('.toParam'),
    });
  }

  runPreview () {
    this.do ('preview-csv', {
      filePath: this.getFormValue ('.file'),
    });
  }

  run () {
    const mapping = this.getFormValue ('.mapping.rows.mapping').toJS ();
    delete mapping.id;

    this.do ('load-csv', {
      filePath: this.getFormValue ('.file'),
      rowGoblin: this.getFormValue ('.goblinName'),
      mapping,
    });
  }

  render () {
    const Form = this.Form;
    const ShowTable = this.getWidgetToFormMapper (Container, header => {
      return {show: header.state.size > 0};
    }) ('.preview.header');

    const PreviewTable = this.getWidgetToFormMapper (Table, data => {
      const table = data.toJS ();
      return {data: table};
    }) ('.preview');

    const MappingTable = this.getWidgetToFormMapper (Table, data => {
      const table = data.toJS ();
      return {data: table};
    }) ('.mapping');

    const Columns = this.WithState (Field, header => {
      if (!header) {
        return {list: [], model: '.fromColumn'};
      }
      const list = header.map (h => h.get ('id')).toArray ();
      return {list, model: '.fromColumn'};
    }) ('.mapping.header');

    return (
      <Container kind="view" grow="1" spacing="large">
        <Form {...this.formConfig}>
          <Container kind="pane-header">
            <Label text="ETL" kind="pane-header" />
          </Container>
          <Container kind="panes">

            <Field kind="file" accept=".csv" model=".file" />
            <Button text="Prévisualiser" onClick={this.runPreview} />

            <ShowTable kind="pane">

              <Label
                glyph="cube"
                text="Prévisualisation"
                grow="1"
                kind="title"
              />
              <PreviewTable height="500px" />

              <Label glyph="cube" text="Mapping" grow="1" kind="title" />

              <MappingTable />
              <Columns kind="combo" labelText="colonne" />
              <Field labelText="paramètre" model=".toParam" />
              <Button text="ajouter" glyph="plus" onClick={this.addMap} />

              <Label
                glyph="cube"
                text="Importateur goblin"
                grow="1"
                kind="title"
              />
              <Field labelText="goblin name" model=".goblinName" />
              <Button text="démarrer" glyph="plus" onClick={this.run} />
            </ShowTable>
          </Container>

        </Form>
      </Container>
    );
  }
}

export default Etl;
