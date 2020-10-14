/**
 *@NApiVersion 2.x
 *@NScriptType MapReduceScript
 */
define(['N/search', 'N/record', 'N/runtime', "N/transaction"],
    function (search, record, runtime, transaction) {
        var objTransaction = {};
        var arraySucces = [];
        var arrayFail = [];

        function getInputData() {
            try {
                var id_search = runtime.getCurrentScript().getParameter({
                    name: 'custscript_drt_record_delete'
                }) || '';
                log.audit({
                    title: 'id_search',
                    details: JSON.stringify(id_search)
                });
                var respuesta = '';
                if (id_search) {
                    respuesta = search.load({
                        id: id_search
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
                        var deleteRecord = '';
                        var data = JSON.parse(recordData[ids]);
                        log.audit({
                            title: 'data',
                            details: JSON.stringify(data)
                        });
                        log.audit({
                            title: 'objTransaction',
                            details: JSON.stringify(objTransaction)
                        });
                        if (!objTransaction[data.recordType]) {
                            objTransaction[data.recordType] = [];
                        }
                        if (
                            objTransaction[data.recordType].indexOf(data.id) < 0 &&
                            data.recordType &&
                            data.id
                        ) {
                            objTransaction[data.recordType].push(data.id);

                            // if (
                            //     data.recordType == record.Type.CASH_SALE ||
                            //     data.recordType == record.Type.CUSTOMER_PAYMENT ||
                            //     data.recordType == record.Type.INVOICE
                            // ) {
                                // var recordVoid = transaction.void({
                                //     type: data.recordType,
                                //     id: data.id,
                                // })||'';
                                // log.audit({title:'recordVoid',details:JSON.stringify(recordVoid)});
                            // }
                            deleteRecord = record.delete({
                                type: data.recordType,
                                id: data.id,
                            }) || '';

                            log.audit({
                                title: 'deleteRecord',
                                details: JSON.stringify(deleteRecord) + ' ' + (deleteRecord == data.id)
                            });
                        }
                    } catch (error) {
                        log.error({
                            title: 'error transaccion: ' + data.recordType + ' ID: ' + data.id,
                            details: JSON.stringify(error)
                        });
                    } finally {
                        if (deleteRecord == data.id) {
                            arraySucces.push(data.id);
                        } else if(
                            arraySucces.indexOf(data.id)<0
                        ){
                            arrayFail.push(data.id);
                        }
                    }
                    log.audit({
                        title: 'arraySucces',
                        details: JSON.stringify(arraySucces)
                    });
                    log.audit({
                        title: 'arrayFail',
                        details: JSON.stringify(arrayFail)
                    });

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