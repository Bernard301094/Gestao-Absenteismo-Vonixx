const generateNewInsight = async () => {
    if (!selectedEmployeeDetail) return;
    
    const currentEmpId = selectedEmployeeDetail.id;
    const currentReqShift = activeShift;
    const currentReqMonth = currentMonth;
    const currentReqYear = currentYear;

    setLoadingInsight(true);
    setInsightError(null);
    setInsight(null);

    try {
      const insightDocId = `${currentEmpId}_${currentReqYear}_${currentReqMonth}_${currentReqShift}`;
      const insightRef = doc(db, 'ai_insights', insightDocId);

      const record = globalAttendance[currentEmpId] || {};
      const holidays = getHolidaysForYear(currentReqYear).filter(
        h => parseInt(h.date.split('-')[1], 10) === currentReqMonth + 1
      );
      
      const realSysDate = new Date();
      let dayInt = realSysDate.getDate();
      if (realSysDate.getMonth() !== currentReqMonth || realSysDate.getFullYear() !== currentReqYear) {
         dayInt = new Date(currentReqYear, currentReqMonth + 1, 0).getDate();
      }
      
      const currentDateString = `${currentReqYear}-${String(currentReqMonth + 1).padStart(2, '0')}-${String(dayInt).padStart(2, '0')}`;

      // NOVO: Preparar um histórico em português legível para a IA não alucinar datas e folgas.
      const detailedHistoryArray = [];
      for (let d = 1; d <= dayInt; d++) {
         const wdName = getWeekdayName(d, currentReqMonth, currentReqYear);
         const status = record[d];
         
         if (status === 'F') detailedHistoryArray.push(`- Dia ${d} (${wdName}): FALTA INJUSTIFICADA (Dia de Trabalho)`);
         else if (status === 'Fe') detailedHistoryArray.push(`- Dia ${d} (${wdName}): FÉRIAS`);
         else if (status === 'A') detailedHistoryArray.push(`- Dia ${d} (${wdName}): AFASTAMENTO LEGAL`);
         else if (status === 'P') detailedHistoryArray.push(`- Dia ${d} (${wdName}): PRESENÇA CONFIRMADA`);
      }
      const detailedHistoryText = detailedHistoryArray.length > 0 
        ? detailedHistoryArray.join('\n') 
        : 'Nenhum registro de falta ou presença anotado até o momento.';

      const response = await generateEmployeeInsight(
        selectedEmployeeDetail,
        record,
        holidays,
        currentDateString,
        detailedHistoryText // Enviando o texto preparado
      );

      await setDoc(insightRef, {
        insight: response,
        employeeId: currentEmpId,
        year: currentReqYear,
        month: currentReqMonth,
        shift: currentReqShift,
        updatedAt: new Date().toISOString()
      }, { merge: true });

      if (selectedEmployeeDetail?.id === currentEmpId && 
          activeShift === currentReqShift && 
          currentMonth === currentReqMonth && 
          currentYear === currentReqYear) {
        setInsight(response);
      }
    } catch (err: any) {
      setInsightError('Erro ao gerar insight. Verifique se as chaves de API estão configuradas nas configurações do projeto.');
    } finally {
      setLoadingInsight(false);
    }
  };
