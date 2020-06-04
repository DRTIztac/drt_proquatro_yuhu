/**
 *@NApiVersion 2.x
 *@NScriptType Restlet
 */
define(['./drt_cn_lib.js', 'N/search'], function (drt_cn_lib, search) {
    function _get(context) {
        try {
            log.audit({
                title: 'context _get',
                details: context
            });
            var respuesta = {
                success: false,
                data: {},
                record: '',
                error: {}
            };
            switch (context.data) {
                case "status": {
                    var checkStatus = drt_cn_lib.responseYuhu(context.record);
                    respuesta = {};
                    respuesta = checkStatus;
                }
                break;

            default:
                respuesta.data.message = 'Invalid Action.';
                break;
            }

            respuesta.success = Object.keys(respuesta.data).length > 0;
        } catch (error) {
            log.audit({
                title: 'error',
                details: error
            });
            respuesta.error = error;
            if (respuesta.record) {
                drt_cn_lib.submitRecord('customrecord_drt_nc_conect', respuesta.record, {
                    custrecord_drt_nc_c_error: JSON.stringify(error)
                });
            }
        } finally {
            log.audit({
                title: 'respuesta',
                details: respuesta
            });
            if (respuesta.record) {
                drt_cn_lib.submitRecord('customrecord_drt_nc_conect', respuesta.record, {
                    custrecord_drt_nc_c_respuesta: JSON.stringify(respuesta)
                })
            }
            return respuesta;
        }
    }

    function _post(context) {
        try {
            log.audit({
                title: 'context _post',
                details: context
            });
            var respuesta = {
                success: false,
                data: {},
                record: '',
                error: {}
            };
            if (context.data == "update") {
                var update = drt_cn_lib.updateYuhu(context);
                respuesta = {};
                respuesta = update;

            } else {

                if (
                    context.recordtype == "invoice" ||
                    context.recordtype == "customerpayment" ||
                    context.recordtype == "cashsale" ||
                    context.recordtype == "journalentry" ||
                    context.recordtype == "salesorder"
                ) {
                    var recordLog = drt_cn_lib.createRecord('customrecord_drt_nc_conect', {
                        custrecord_drt_nc_c_context: JSON.stringify(context),
                        custrecord_drt_nc_c_http: 'POST'
                    });
                    if (recordLog.success) {
                        respuesta.data = recordLog.data;
                        respuesta.record = recordLog.data;

                    }
                    respuesta.success = respuesta.record != '';

                } else {
                    respuesta.data.message = 'Invalid Action.';
                }
            }

        } catch (error) {
            log.audit({
                title: 'error',
                details: error
            });
            respuesta.error = error;
            if (respuesta.record) {
                drt_cn_lib.submitRecord('customrecord_drt_nc_conect', respuesta.record, {
                    custrecord_drt_nc_c_error: JSON.stringify(error)
                });
            }
        } finally {
            log.audit({
                title: 'respuesta',
                details: respuesta
            });
            if (respuesta.record) {
                drt_cn_lib.submitRecord('customrecord_drt_nc_conect', respuesta.record, {
                    custrecord_drt_nc_c_respuesta: JSON.stringify(respuesta)
                })
            }
            return respuesta;
        }
    }


    return {
        get: _get,
        post: _post,
    }
});