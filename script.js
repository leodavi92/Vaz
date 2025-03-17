window.jsPDF = window.jspdf.jsPDF;

// Add at the beginning of your script.js file
document.addEventListener('DOMContentLoaded', function() {
    // Check if user is logged in
    if (!sessionStorage.getItem('loggedIn')) {
        window.location.href = 'index.html'; // Updated this line
        return;
    }

    // Add product button
    const addProductBtn = document.getElementById('addProduct');
    addProductBtn.addEventListener('click', function(e) {
        e.preventDefault();
        e.stopPropagation();
        const tbody = document.getElementById('productTableBody');
        const tr = document.createElement('tr');
        tr.innerHTML = `
            <td><input type="tel" class="form-control" name="code" required></td>
            <td><input type="text" class="form-control" name="description" required></td>
            <td><input type="tel" class="form-control" name="price" step="0.01" required></td>
            <td><input type="tel" class="form-control" name="quantity" value="1" min="1" required></td>
            <td>R$ <span class="row-total">0.00</span></td>
            <td><button type="button" class="btn btn-danger btn-sm remove-row">Remover</button></td>
        `;
        tbody.appendChild(tr);
        addRowEventListeners(tr);
    });

    // Generate PDF button
    const generatePDFBtn = document.getElementById('generatePDF');
    generatePDFBtn.addEventListener('click', function(e) {
        e.preventDefault();
        e.stopPropagation();
        alert('Gerando PDF, aguarde...');
        
        const doc = new jsPDF({
            orientation: 'portrait',
            unit: 'mm',
            format: 'a4'
        });
        const pageWidth = doc.internal.pageSize.getWidth();

        // Company header
        doc.setFontSize(20);
        doc.text('VAZ PRÉ-MOLDADOS', pageWidth / 2, 20, { align: 'center' });
        doc.setFontSize(12);
        doc.text(`Data: ${document.getElementById('currentDate').textContent}`, 20, 30);
        doc.text('CNPJ: 29.672.312/0001-23', 20, 37);
        const documentType = document.querySelector('input[name="documentType"]:checked').value;
        doc.text(documentType.toUpperCase(), pageWidth - 20, 30, { align: 'right' });

        // Customer information
        const startY = 45;
        const lineHeight = 7;
        let currentY = startY;

        // Function to add a field with label
        function addField(label, value, y) {
            doc.setFontSize(10);
            doc.setFont('helvetica', 'bold');
            doc.text(label, 20, y);
            doc.setFont('helvetica', 'normal');
            doc.text(value || '', 20, y + 5);
            doc.setDrawColor(200, 200, 200);
            doc.setLineWidth(0.1);
            doc.line(20, y + 6, 190, y + 6);
        }

        // Add customer fields
        addField('Nome do Cliente', document.getElementById('clientName').value, currentY);
        currentY += lineHeight * 2;

        addField('Endereço', document.getElementById('address').value, currentY);
        currentY += lineHeight * 2;

        addField('Email', document.getElementById('email').value, currentY);
        currentY += lineHeight * 2;

        // Add fields in two columns
        const colWidth = 85;
        function addTwoColumnFields(y, field1Label, field1Value, field2Label, field2Value) {
            // First column
            doc.setFontSize(10);
            doc.setFont('helvetica', 'bold');
            doc.text(field1Label, 20, y);
            doc.setFont('helvetica', 'normal');
            doc.text(field1Value || '', 20, y + 5);
            doc.setDrawColor(200, 200, 200);
            doc.setLineWidth(0.1);
            doc.line(20, y + 6, 95, y + 6);

            // Second column
            doc.setFont('helvetica', 'bold');
            doc.text(field2Label, 105, y);
            doc.setFont('helvetica', 'normal');
            doc.text(field2Value || '', 105, y + 5);
            doc.line(105, y + 6, 180, y + 6);
        }

        // Add two-column fields
        addTwoColumnFields(
            currentY,
            'Bairro',
            document.getElementById('neighborhood').value,
            'Cidade',
            document.getElementById('city').value
        );
        currentY += lineHeight * 2;

        addTwoColumnFields(
            currentY,
            'Telefone',
            document.getElementById('phone').value,
            'CEP',
            document.getElementById('zipcode').value
        );
        currentY += lineHeight;  // Reduced from lineHeight * 2

        // Products table with reduced top margin
        const tableData = [];
        document.querySelectorAll('#productTableBody tr').forEach(row => {
            tableData.push([
                row.querySelector('[name="code"]').value,
                row.querySelector('[name="description"]').value,
                `R$ ${row.querySelector('[name="price"]').value}`,
                row.querySelector('[name="quantity"]').value,
                `R$ ${row.querySelector('.row-total').textContent}`
            ]);
        });

        const tableStartY = currentY + 5;  // Reduced from 10
        doc.autoTable({
            margin: { top: 5, left: 20, right: 20 },  // Reduced top margin
            startY: tableStartY,
            head: [['Cod', 'Produto', 'Preço', 'Quantidade', 'Total']],
            body: tableData,
            theme: 'grid',
            styles: { 
                fontSize: 11,
                cellPadding: 6
            },
            alternateRowStyles: {
                fillColor: [249, 249, 249]
            },
            didDrawPage: function(data) {
                // Reset margins and position for new pages
                data.settings.margin.top = 20;
            },
            willDrawCell: function(data) {
                // Ensure text fits within cells
                if (data.cell.text.length > 50) {
                    data.cell.text = data.cell.text.substring(0, 47) + '...';
                }
            }
        });

        // Payment method and total
        let finalY = doc.autoTable.previous.finalY + 10;

        // Check if we need a new page for payment info
        if (finalY > doc.internal.pageSize.height - 50) {
            doc.addPage();
            finalY = 20;
        }

        // Add payment information
        doc.setFontSize(12);
        doc.setFont('helvetica', 'bold');
        doc.text('Informações de Pagamento', 20, finalY);
        finalY += 10;

        doc.setFontSize(10);
        doc.setFont('helvetica', 'normal');
        const paymentMethod = document.getElementById('paymentMethod').value;
        doc.text(`Forma de Pagamento: ${paymentMethod}`, 20, finalY);
        finalY += 7;

        if (paymentMethod === 'Crédito') {
            const installments = document.getElementById('installments').value;
            doc.text(`Parcelas: ${installments}x`, 20, finalY);
            finalY += 7;
        }

        // Add delivery information if selected
        const delivery = document.getElementById('delivery').checked;
        if (delivery) {
            doc.text('Entrega: Sim - No endereço informado', 20, finalY);
            finalY += 7;
        }

        // Add total amount
        doc.setFontSize(14);
        doc.setFont('helvetica', 'bold');
        const total = document.getElementById('totalAmount').textContent;
        doc.text(`Total: R$ ${total}`, pageWidth - 20, finalY, { align: 'right' });

        // Add additional information section with adjusted spacing
        finalY += 10;
        doc.setFontSize(12);
        doc.setFont('helvetica', 'bold');
        doc.text('Informações Adicionais:', 20, finalY);
        
        // Reduced box height and spacing
        finalY += 5;
        doc.setDrawColor(0);
        doc.setLineWidth(0.5);
        const boxHeight = 30;
        doc.rect(20, finalY, pageWidth - 40, boxHeight);

        // Adjusted text spacing
        doc.setFontSize(8); // Reduced font size
        doc.setFont('helvetica', 'normal');
        let textY = finalY + 6;
        
        // Compact text layout
        doc.text('Pilares: A entrega e instalação são realizadas para pré-moldados destinados', 25, textY);
        textY += 4;
        doc.text('exclusivamente à instalação de pilares para caixa d\'água.', 25, textY);
        textY += 6;
        doc.text('Manilhas/Tampas: São entregues apenas, sem instalação.', 25, textY);
        textY += 4;
        doc.text('Garantia: Todos os produtos possuem garantia de 1 ano.', 25, textY);

        // Signature lines with reduced spacing
        finalY = finalY + boxHeight + 15;
        
        // Draw signature lines
        doc.setDrawColor(0);
        doc.setLineWidth(0.5);
        
        // Signatures with adjusted positioning
        doc.line(30, finalY, 90, finalY);
        doc.setFontSize(9);
        doc.text('Assinatura do Vendedor', 60, finalY + 5, { align: 'center' });
        
        doc.line(pageWidth - 90, finalY, pageWidth - 30, finalY);
        doc.text('Assinatura do Cliente', pageWidth - 60, finalY + 5, { align: 'center' });

        // Save the PDF
        doc.save('recibo.pdf');
    });
});


// Function to add event listeners to a row
function addRowEventListeners(row) {
    const priceInput = row.querySelector('[name="price"]');
    const quantityInput = row.querySelector('[name="quantity"]');
    const removeButton = row.querySelector('.remove-row');
    const codeInput = row.querySelector('[name="code"]');
    const descriptionInput = row.querySelector('[name="description"]');

    // Auto-fill product information based on code
    codeInput.addEventListener('input', function() {
        const code = this.value.trim();
        if (code === '01') {
            descriptionInput.value = 'Pilar para caixa de 1000 litros/18x18x3,70cm';
        } else if (code === '02') {
            descriptionInput.value = 'Pilar para caixa de 2000 litros/20x20x3,60cm';
        }
    });

    // Calculate row total when price or quantity changes
    const calculateRowTotal = () => {
        const price = parseFloat(priceInput.value) || 0;
        const quantity = parseInt(quantityInput.value) || 0;
        const total = price * quantity;
        row.querySelector('.row-total').textContent = total.toFixed(2);
        calculateGrandTotal();
    };

    priceInput.addEventListener('input', calculateRowTotal);
    quantityInput.addEventListener('input', calculateRowTotal);
    
    removeButton.addEventListener('click', function(e) {
        e.preventDefault();
        row.remove();
        calculateGrandTotal();
    });
}

// Add this function at the end of the file
function calculateGrandTotal() {
    const totals = Array.from(document.querySelectorAll('.row-total'))
        .map(el => parseFloat(el.textContent) || 0);
    const grandTotal = totals.reduce((sum, val) => sum + val, 0);
    document.getElementById('totalAmount').textContent = grandTotal.toFixed(2);
}

    // Add payment method change listener
    const paymentMethod = document.getElementById('paymentMethod');
    const creditOptions = document.getElementById('creditOptions');

    paymentMethod.addEventListener('change', function() {
        if (this.value === 'Crédito') {
            creditOptions.style.display = 'block';
        } else {
            creditOptions.style.display = 'none';
        }
    });