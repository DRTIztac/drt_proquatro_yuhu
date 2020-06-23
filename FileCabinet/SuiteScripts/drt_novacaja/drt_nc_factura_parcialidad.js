/**
 * @NApiVersion 2.x
 * @NScriptType MapReduceScript
 * @NModuleScope SameAccount
 */
define(['N/record', 'N/search'],

function(record,search) {
   
    /**
     * Marks the beginning of the Map/Reduce process and generates input data.
     *
     * @typedef {Object} ObjectRef
     * @property {number} id - Internal ID of the record instance
     * @property {string} type - Record type id
     *
     * @return {Array|Object|Search|RecordRef} inputSummary
     * @since 2015.1
     */
    function getInputData() {
    	
    	const param_registro= 'customsearch_drt_ss_line_salesorder';
    	var respuesta=[];
        var transactionSearchObj = search.load({
            id: param_registro
        });

        
         var defaultFilters = transactionSearchObj.filters;

         var allFilters = defaultFilters;
         transactionSearchObj.filters = allFilters;
         

    	 return transactionSearchObj;
    }
    

    /**
     * Executes when the map entry point is triggered and applies to each key/value pair.
     *
     * @param {MapSummary} context - Data collection containing the key/value pairs to process through the map stage
     * @since 2015.1
     */
    function map(context) {
    	var rowJson = JSON.parse(context.value),
    	rowValues= rowJson.values,
    	itemValues= rowValues.item;
    	
    
    	
    	log.debug({title:"JSON DETAIL",details:JSON.stringify(rowJson)})
    	
    		var id=rowValues.tranid;
    	var fecha=  rowValues.custcol_drt_nc_fecha;
    	var amortizacion=rowValues.custcol_drt_nc_num_amortizacion;
    	var conexion = rowValues.custbody_drt_nc_con_so ;
    	log.debug({title:"id amortizacion",details:id +   fecha })
    	
   /*
    * {"recordType":"salesorder"
    * ,"id":"1543",
    * "values":{"tranid":"85",
    * "item":
    * {"value":"17","text":"ARTICULO INTERES"},"custcol2":"","custcol_drt_nc_fecha":"2020-06-19","custcol_drt_nc_num_amortizacion":"2"}}*/
    	try{



    	var invrec = record.transform({
    		'fromType':record.Type.SALES_ORDER,
    		'fromId':Number(rowJson.id),
    		'toType':record.Type.INVOICE,
    		 isDynamic: true
    	});
    
    	
    	var itemcount = invrec.getLineCount({"sublistId": "item"});
    
    	log.debug({title:"itemcount",details:itemcount })
    	for (var j = itemcount-1; j >=0  ; j--)
    	{
    	    
    	    
    	    var sublistFieldValue = invrec.getSublistValue({
    	    	 sublistId: 'item',
    	    	 fieldId: 'custcol_drt_nc_num_amortizacion',
    	    	 line:j
    	    })
log.debug({title:"sublistFieldValue",details:sublistFieldValue })
    	    if ( amortizacion != sublistFieldValue)
    	    {
    	    	invrec.removeLine({
    	    		 sublistId: 'item',
    	    		 line: j
    	    		});
    	    }
    	}
   
    	invrec.setValue({fieldId:'custbody_drt_nc_con_in',value:conexion})


    	var invoiceid = invrec.save({
    		'enableSourcing':true,
    		'ignoreMandatoryFields':true
    	});
    	
    	
    	log.debug({title:"generated invoice id",details:invoiceid})
    	


    	}catch(error){
        	log.debug({title:"error",details:error })

    	}
    }

    /**
     * Executes when the reduce entry point is triggered and applies to each group.
     *
     * @param {ReduceSummary} context - Data collection containing the groups to process through the reduce stage
     * @since 2015.1
     */
    function reduce(context) {

    }


    /**
     * Executes when the summarize entry point is triggered and applies to the result set.
     *
     * @param {Summary} summary - Holds statistics regarding the execution of a map/reduce script
     * @since 2015.1
     */
    function summarize(summary) {

    }

    return {
        getInputData: getInputData,
        map: map,
        reduce: reduce,
        summarize: summarize
    };
    
});
