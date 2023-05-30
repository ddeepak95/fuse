import pdfMake from "pdfmake/build/pdfmake";
import pdfFonts from "pdfmake/build/vfs_fonts";
pdfMake.vfs = pdfFonts.pdfMake.vfs;

function checkContentAndSetValue(data) {
  let value = data.text === "" ? 0 : 5;
  return value;
}

const DownloadPdf = (props) => {
  function prepareText() {
    let data = props.data;
    let content = [
      {
        text: data.whatLearningMathIsLike,
        style: "paragraph",
        margin: [0, checkContentAndSetValue(data.whatLearningMathIsLike)],
      },
      {
        text: data.strugglingInClass,
        style: "paragraph",
        margin: [0, checkContentAndSetValue(data.strugglingInClass)],
      },
      {
        text: data.askingQuestions,
        style: "paragraph",
        margin: [0, checkContentAndSetValue(data.askingQuestions)],
      },
      {
        text: data.revisingAndRedoingYourWork,
        style: "paragraph",
        margin: [0, checkContentAndSetValue(data.revisingAndRedoingYourWork)],
      },
      {
        text: data.exams,
        style: "paragraph",
        margin: [0, checkContentAndSetValue(data.exams)],
      },
      {
        text: data.howStudentsUsuallyPerform,
        style: "paragraph",
        margin: [0, checkContentAndSetValue(data.howStudentsUsuallyPerform)],
      },
      {
        text: data.finalThoughts,
        style: "paragraph",
        margin: [0, checkContentAndSetValue(data.finalThoughts)],
      },
    ];

    return content;
  }

  function downloadPdf() {
    var docDefinition = {
      info: {
        title: "First Day Speech",
        creator: "UTAustin",
        producer: "UTAustin",
      },
      pageSize: "LETTER",
      pageMargins: 60,
      content: [
        {
          text: "First Day of Class Speech",
          style: "header",
          margin: [0, 0, 0, 15],
        },
        ...prepareText(props.data),
      ],

      styles: {
        header: {
          fontSize: 22,
          bold: true,
        },
        paragraph: {
          fontSize: 12,
          lineHeight: 1.4,
        },
      },
    };
    pdfMake.createPdf(docDefinition).open();
  }
  return (
    <>
      <button
        className="bg-fuseYellow hover:bg-fuseYellow-dark cursor-pointer px-6 py-3 rounded-lg text-white font-bold"
        onClick={() => {
          downloadPdf();
        }}
      >
        Download Speech as PDF
      </button>
    </>
  );
};

export default DownloadPdf;
