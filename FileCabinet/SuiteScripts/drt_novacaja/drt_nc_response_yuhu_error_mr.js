/**
 *@NApiVersion 2.x
 *@NScriptType MapReduceScript
 */
define([
        'N/search',
        'N/record',
        './drt_cn_lib',
        'N/runtime'
    ],
    function (
        search,
        record,
        drt_cn_lib,
        runtime) {
        var searchType = runtime.getCurrentScript().getParameter("custscript_drt_rd_folder") || '';
        var arrayColumns = runtime.getCurrentScript().getParameter("custscript_drt_rd_folder") || '';
        var arrayFilters = runtime.getCurrentScript().getParameter("custscript_drt_rd_folder") || '';
        var pendiente_enviar_field = runtime.getCurrentScript().getParameter("custscript_drt_rd_folder") || '';
        var informacion_envio_field = runtime.getCurrentScript().getParameter("custscript_drt_rd_folder") || '';

        function getInputData() {
            try {
                var arrayFilter = [
                    ['custentity_drt_nc_con_cm', search.Operator.NONEOF, '@NONE@'],
                    'and',
                    ['custentity_drt_nc_pendiente_enviar', search.Operator.IS, "T"]
                ];

                var respuesta = '';
                if (
                    searchType &&
                    arrayColumns &&
                    arrayFilters &&
                    pendiente_enviar_field &&
                    informacion_envio_field
                ) {
                    respuesta = search.create({
                        type: searchType,
                        columns: arrayColumns,
                        filters: arrayFilters
                    });
                }
            } catch (error) {
                log.error({
                    title: 'error getInputData',
                    details: JSON.stringify(error)
                });
            } finally {
                return respuesta;
            }

        }

        function map(context) {
            try {
                var objvalue = JSON.parse(context.value)

                context.write({
                    key: objvalue.id,
                    value: objvalue
                });
            } catch (error) {
                log.error({
                    title: 'error map',
                    details: JSON.stringify(error)
                });
            }
        }

        function reduce(context) {
            try {
                var recordData = context.values;

                for (var ids in recordData) {
                    try {
                        var data = JSON.parse(recordData[ids]);
                        var webhookConsultado = 'error';
                        var response = {
                            data: {
                                code: '',
                                body: '',
                            }
                        };
                        var dataWebhook = drt_cn_lib.bookWebhook(webhookConsultado);
                        if (dataWebhook.success) {
                            data.webhook = dataWebhook.data.url;
                            response = drt_cn_lib.postWebhook(dataWebhook.data.header, dataWebhook.data.url, data);
                        }
                        log.audit({
                            title: ' statuscode ' + response.data.code +
                                ' recordType: ' + data.recordType +
                                ' id: ' + data.id,
                            details: JSON.stringify(data)
                        });

                        if (
                            data.recordType &&
                            data.id
                        ) {

                            var objRecord = record.load({
                                type: data.recordType,
                                id: data.id,
                                isDynamic: true
                            });
                            if (response.data.code == 200) {
                                objRecord.setValue({
                                    fieldId: pendiente_enviar_field,
                                    value: false,
                                    ignoreFieldChange: true
                                });
                            }


                            objRecord.setValue({
                                fieldId: informacion_envio_field,
                                value: JSON.stringify(data),
                                ignoreFieldChange: true
                            });

                            var recordId = objRecord.save({
                                enableSourcing: true,
                                ignoreMandatoryFields: true
                            });
                            log.audit({
                                title: 'recordId',
                                details: JSON.stringify(recordId)
                            });
                        }
                    } catch (error) {
                        log.error({
                            title: 'error reduce',
                            details: JSON.stringify(error)
                        });
                    }
                }
            } catch (error) {
                log.error({
                    title: 'error reduce',
                    details: JSON.stringify(error)
                });
            }
        }

        function summarize(context) {
            try {
                log.audit({
                    title: ' context summary ',
                    details: JSON.stringify(context)
                });
                log.audit({
                    title: 'Usage units consumed',
                    details: context.usage
                });
                log.audit({
                    title: 'Concurrency',
                    details: context.concurrency
                });
                log.audit({
                    title: 'Number of yields',
                    details: context.yields
                });
                var text = '';
                var totalKeysSaved = 0;
                context.output.iterator().each(function (key, value) {
                    text += (key + ' ' + value + '\n');
                    totalKeysSaved++;
                    return true;
                });
                log.audit({
                    title: 'Unique number of letters used in string',
                    details: totalKeysSaved
                });
            } catch (error) {
                log.error({
                    title: 'error summarize',
                    details: JSON.stringify(error)
                });
            }

        }

        return {
            getInputData: getInputData,
            map: map,
            reduce: reduce,
            summarize: summarize
        }
    });