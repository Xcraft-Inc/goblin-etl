import React from 'react';
import Form from 'goblin-laboratory/widgets/form';

import Container from 'goblin-gadgets/widgets/container/widget';
import Label from 'goblin-gadgets/widgets/label/widget';
import Button from 'goblin-gadgets/widgets/button/widget';
import Field from 'goblin-gadgets/widgets/field/widget';
import Table from 'goblin-gadgets/widgets/table/widget';
import FileInput from 'goblin-gadgets/widgets/file-input/widget';

class Etl extends Form {
  constructor() {
    super(...arguments);
    this.runPreview = this.runPreview.bind(this);
    this.addMap = this.addMap.bind(this);
    this.run = this.run.bind(this);
  }

  static get wiring() {
    return {
      id: 'id',
    };
  }

  addMap() {
    this.do('map-column-to-param', {
      table: this.getFormValue('.table'),
      type: this.getFormValue('.type'),
      fromColumn: this.getFormValue('.fromColumn'),
      toParam: this.getFormValue('.toParam'),
    });
  }

  runPreview() {
    this.do('preview-csv', {
      filePath: this.getFormValue('.file'),
    });
  }

  run() {
    const mapping = this.getFormValue('.mapping.rows').toJS();
    this.do('load-csv', {
      filePath: this.getFormValue('.file'),
      mapping,
    });
  }

  render() {
    const Form = this.Form;
    const ShowTable = this.getWidgetToFormMapper(Container, (header) => {
      return {show: header.state.size > 0};
    })('.preview.header');

    const PreviewTable = this.getWidgetToFormMapper(Table, (data) => {
      const table = data.toJS();
      return {data: table};
    })('.preview');

    const MappingTable = this.getWidgetToFormMapper(Table, (data) => {
      const table = data.toJS();
      return {data: table};
    })('.mapping');

    const Columns = this.WithState(Field, (header) => {
      if (!header) {
        return {list: [], model: '.fromColumn'};
      }
      const list = header
        .map((h) => h.get('id'))
        .valueSeq()
        .toArray();
      return {list, model: '.fromColumn'};
    })('.preview.header');

    return (
      <Container kind="view" grow="1" horizontalSpacing="large">
        <Form {...this.formConfig}>
          <Container kind="pane-header">
            <Label text="ETL" kind="pane-header" />
          </Container>
          <Container kind="panes">
            <Label glyph="light/cube" text="Extraire" grow="1" kind="title" />

            <FileInput accept=".csv" model=".file" />
            <Button text="démarrer" onClick={this.runPreview} />

            <Label
              glyph="light/cube"
              text="Transformer"
              grow="1"
              kind="title"
            />

            <MappingTable frame={true} />
            <Field labelText="table" model=".table" />
            <Field labelText="type" model=".type" />
            <Columns kind="radio" labelText="colonne" direction="wrap" />
            <Field labelText="paramètre" model=".toParam" />
            <Button text="ajouter" glyph="solid/plus" onClick={this.addMap} />

            <Label glyph="light/cube" text="Charger" grow="1" kind="title" />
            <Button text="démarrer" glyph="solid/plus" onClick={this.run} />

            <ShowTable kind="pane">
              <Label
                glyph="light/cube"
                text="Prévisualisation"
                grow="1"
                kind="title"
              />
              <PreviewTable frame={true} />
            </ShowTable>
          </Container>
        </Form>
      </Container>
    );
  }
}

export default Etl;
