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
  }

  static get wiring () {
    return {
      id: 'id',
    };
  }

  runPreview () {
    this.do ('preview-csv', {
      filePath: this.getFormValue ('.file'),
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

    return (
      <Container kind="view" grow="1" spacing="large">
        <Container kind="pane-header">
          <Label text="ETL" kind="pane-header" />
        </Container>
        <Container kind="panes">
          <Form {...this.formConfig}>
            <Field kind="file" accept=".csv" model=".file" />
            <Button text="Prévisualiser" onClick={this.runPreview} />
          </Form>
          <Container kind="pane">
            <Container kind="row-pane">
              <Label
                glyph="cube"
                text="Prévisualisation"
                grow="1"
                kind="title"
              />
            </Container>
            <ShowTable kind="row-pane">
              <PreviewTable height="500px" />
            </ShowTable>
          </Container>
        </Container>

      </Container>
    );
  }
}

export default Etl;
