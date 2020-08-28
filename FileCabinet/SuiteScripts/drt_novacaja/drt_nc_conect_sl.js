/**
 *@NApiVersion 2.x
 *@NScriptType Suitelet
 */
define(
    [
        'N/ui/serverWidget',
        'N/record',
        'N/file',
        'N/https',
        'N/search',
        './drt_cn_lib'
    ],
    function (
        serverWidget,
        record,
        file,
        https,
        search,
        drt_cn_lib
    ) {
        function onRequest(context) {
            try {
                if (context.request.method === 'GET') {
                    log.audit({
                        title: 'context GET',
                        details: JSON.stringify(context)
                    });
                    printForm(context);
                } else {
                    log.audit({
                        title: 'context POST',
                        details: JSON.stringify(context)
                    });
                    context.response.write(JSON.stringify(context.request.parameters));
                }
            } catch (error) {

            }
        }

        function printForm(context) {
            try {
                var respuesta = {
                    success: false,
                    data: {}
                };

                var form = serverWidget.createForm({
                    title: 'DRT DevelopTool'
                });


                var cuentaItem = drt_cn_lib.lookup(search.Type.ITEM, 17, ['custitem_drt_accounnt_capital']);

                var objField = [{
                        id: 'custpage_result',
                        type: serverWidget.FieldType.TEXTAREA,
                        label: 'Resultado',
                        seleccion: [],
                        defaultValue: JSON.stringify(cuentaItem.data.custitem_drt_accounnt_capital[0].value),
                        add: 'addField',
                        field: [],
                    },

                ];




                for (var field in objField) {
                    var field_add = form[objField[field].add]({
                        id: objField[field].id,
                        type: objField[field].type,
                        label: objField[field].label
                    });
                    for (var value = 0; value < objField[field].seleccion.length; value++) {
                        field_add.addSelectOption(objField[field].seleccion[value]);
                    }
                    if (objField[field].defaultValue) {
                        field_add.defaultValue = objField[field].defaultValue;
                    }
                    for (var campo in objField[field].field) {
                        field_add.addField({
                            id: objField[field].field[campo].id,
                            type: objField[field].field[campo].type,
                            label: objField[field].field[campo].label,
                        });
                    }
                }


                form.addSubmitButton({
                    label: 'Procesar'
                });
                respuesta.success = Object.keys(respuesta.data).length > 0;
            } catch (error) {
                log.error({
                    title: 'error',
                    details: JSON.stringify(error)
                });
                var form = serverWidget.createForm({
                    title: 'DRT NC - ERROR'
                });
                var field_add = form.addField({
                    id: 'custpage_error',
                    type: serverWidget.FieldType.TEXTAREA,
                    label: 'ERROR'
                });

                field_add.defaultValue = JSON.stringify(error);
            } finally {

                log.emergency({
                    title: 'respuesta printForm',
                    details: JSON.stringify(respuesta)
                });
                context.response.writePage(form);
                return respuesta;
            }
        }




        return {
            onRequest: onRequest
        }
    }
);