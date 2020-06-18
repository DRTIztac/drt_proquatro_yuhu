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
                    title: 'DRT NC - Response Yuhu'
                });
                var response = {
                    data: {
                        code: '',
                        body: '',
                    }
                };
                try {
                    var arrayWebhook = [
                        'create-order', //credito_inicial,
                        'maturities-receivable', //vencimiento_por_cobrar,
                        'update-credit', //actualiza_saldo_credito,
                        'outstanding-balance', //saldo_pendiente_aplicar,
                    ];

                    var webhookConsultado = arrayWebhook[0];
                    if (context.request.parameters.webhook && arrayWebhook.indexOf(context.request.parameters.webhook) >= 0) {
                        webhookConsultado = context.request.parameters.webhook;
                    }
                    if (context.request.parameters.webhook && parseInt(context.request.parameters.webhook) >= 0 && parseInt(context.request.parameters.webhook) <= 3) {
                        webhookConsultado = arrayWebhook[context.request.parameters.webhook];
                    }

                    var dataWebhook = drt_cn_lib.bookWebhook(webhookConsultado);
                    if (dataWebhook.success) {
                        response = drt_cn_lib.postWebhook(dataWebhook.data.header, dataWebhook.data.url, dataWebhook.data.ejemplo);
                    } else {
                        response.data.code = '0';
                        response.data.body = 'No existe Webhook ';
                    }





                } catch (error) {
                    log.error({
                        title: 'error',
                        details: JSON.stringify(error)
                    });
                }
                var objField = [{
                        id: 'custpage_case',
                        type: serverWidget.FieldType.TEXT,
                        label: 'Webhook Consultado',
                        seleccion: [],
                        defaultValue: webhookConsultado,
                        add: 'addField',
                        field: [],
                    },
                    {
                        id: 'custpage_respose',
                        type: serverWidget.FieldType.TEXTAREA,
                        label: 'Respuesta Yuhu Body',
                        seleccion: [],
                        defaultValue: JSON.stringify(response).substring(0, 4000),
                        add: 'addField',
                        field: [],
                    }, {
                        id: 'custpage_length',
                        type: serverWidget.FieldType.TEXT,
                        label: 'Respuesta Yuhu length',
                        seleccion: [],
                        defaultValue: JSON.stringify(response).length,
                        add: 'addField',
                        field: [],
                    }, {
                        id: 'custpage_code',
                        type: serverWidget.FieldType.TEXT,
                        label: 'Respuesta Yuhu code',
                        seleccion: [],
                        defaultValue: response.data.code,
                        add: 'addField',
                        field: [],
                    }
                ];
                // context.response.write(JSON.stringify(response));




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

        function post_file(file_name, folder, file_type, value) {

            var file_instance = file.create({
                name: file_name,
                fileType: file_type,
                contents: value,
                description: file_name,
                folder: folder
            });

            file_instance.save();
        }

        function metadataFile(param_file_id) {
            try {
                var respuesta = {
                    success: false,
                    data: []
                };
                log.audit({
                    title: 'param_file_id',
                    details: JSON.stringify(param_file_id)
                });
                var objFile = file.load({
                    id: param_file_id
                });
                var contenFile = objFile.getContents();
                log.audit({
                    title: 'contenFile',
                    details: JSON.stringify(contenFile)
                });

                var iterator = objFile.lines.iterator();
                log.audit({
                    title: 'iterator',
                    details: JSON.stringify(iterator)
                });

                iterator.each(function (line) {
                    var lineValues = line.value.split('~');
                    log.audit({
                        title: 'lineValues linea 0',
                        details: JSON.stringify(lineValues)
                    });
                    return false;
                });

                iterator.each(function (line) {
                    var lineValues = line.value.split('~');
                    log.audit({
                        title: 'lineValues',
                        details: JSON.stringify(lineValues)
                    });
                    respuesta.data.push({
                        sublist_uuid: lineValues[0] || 0,
                        sublist_rfc_emisor: lineValues[1] || 0,
                        sublist_nombre_emisor: lineValues[2] || 0,
                        sublist_rfc_receptor: lineValues[3] || 0,
                        sublist_nombre_receptor: lineValues[4] || 0,
                        sublist_rfc_pac: lineValues[5] || 0,
                        sublist_fecha_emision: lineValues[6] || 0,
                        sublist_fecha_certificacion_sat: lineValues[7] || 0,
                        sublist_monto: lineValues[8] || 0,
                        sublist_efecto_comprobante: lineValues[9] || 0,
                        sublist_estatus: lineValues[10] || 0,
                        sublist_fecha_cancelacion: lineValues[11] || 0,
                    });
                    return true;
                });

                respuesta.success = respuesta.data.length > 0;
            } catch (error) {
                log.error({
                    title: 'error',
                    details: JSON.stringify(error)
                });
            } finally {
                log.emergency({
                    title: 'respuesta metadataFile',
                    details: JSON.stringify(respuesta)
                });
                return respuesta;
            }
        }

        return {
            onRequest: onRequest
        }
    }
);