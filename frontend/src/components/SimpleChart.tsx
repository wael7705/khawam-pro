import React from 'react'

interface SimpleChartProps {
  data: Array<{ name: string; value: number }>
  title: string
  type?: 'pie' | 'bar'
  height?: number
}

export const SimplePieChart: React.FC<{ data: Array<{ name: string; value: number }> }> = ({ data }) => {
  const total = data.reduce((sum, item) => sum + item.value, 0)
  const colors = ['#667eea', '#764ba2', '#f093fb', '#4facfe', '#00f2fe', '#43e97b']
  
  let currentAngle = 0
  
  return (
    <svg viewBox="0 0 200 200" style={{ width: '100%', height: '250px' }}>
      <circle
        cx="100"
        cy="100"
        r="80"
        fill="none"
        stroke="#e5e7eb"
        strokeWidth="20"
      />
      {data.map((item, index) => {
        const percentage = (item.value / total) * 100
        const angle = (percentage / 100) * 360
        const startAngle = currentAngle
        const endAngle = currentAngle + angle
        currentAngle += angle
        
        const startAngleRad = (startAngle - 90) * (Math.PI / 180)
        const endAngleRad = (endAngle - 90) * (Math.PI / 180)
        
        const x1 = 100 + 80 * Math.cos(startAngleRad)
        const y1 = 100 + 80 * Math.sin(startAngleRad)
        const x2 = 100 + 80 * Math.cos(endAngleRad)
        const y2 = 100 + 80 * Math.sin(endAngleRad)
        
        const largeArcFlag = angle > 180 ? 1 : 0
        
        const pathData = [
          `M 100 100`,
          `L ${x1} ${y1}`,
          `A 80 80 0 ${largeArcFlag} 1 ${x2} ${y2}`,
          `Z`
        ].join(' ')
        
        return (
          <g key={index}>
            <path
              d={pathData}
              fill={colors[index % colors.length]}
              stroke="white"
              strokeWidth="2"
            />
            <text
              x={100 + 50 * Math.cos((startAngle + angle / 2 - 90) * (Math.PI / 180))}
              y={100 + 50 * Math.sin((startAngle + angle / 2 - 90) * (Math.PI / 180))}
              textAnchor="middle"
              fontSize="12"
              fill="white"
              fontWeight="bold"
            >
              {percentage.toFixed(0)}%
            </text>
          </g>
        )
      })}
      <text
        x="100"
        y="100"
        textAnchor="middle"
        fontSize="14"
        fill="#666"
        fontWeight="bold"
      >
        إجمالي
      </text>
    </svg>
  )
}

export const SimpleBarChart: React.FC<{ 
  data: Array<{ label: string; value: number }> 
}> = ({ data }) => {
  const maxValue = Math.max(...data.map(item => item.value), 1)
  const colors = ['#667eea', '#764ba2']
  
  return (
    <div style={{ width: '100%', height: '250px', padding: '20px' }}>
      <div style={{ display: 'flex', height: '100%', alignItems: 'flex-end', gap: '10px' }}>
        {data.map((item, index) => {
          const height = (item.value / maxValue) * 100
          return (
            <div
              key={index}
              style={{
                flex: 1,
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                gap: '5px'
              }}
            >
              <div
                style={{
                  width: '100%',
                  height: `${height}%`,
                  background: `linear-gradient(to top, ${colors[1]}, ${colors[0]})`,
                  borderRadius: '8px 8px 0 0',
                  minHeight: '20px',
                  position: 'relative',
                  display: 'flex',
                  alignItems: 'flex-end',
                  justifyContent: 'center',
                  paddingBottom: '5px'
                }}
                title={`${item.label}: ${item.value.toLocaleString()} ل.س`}
              >
                <span style={{ color: 'white', fontSize: '11px', fontWeight: 'bold' }}>
                  {item.value > 0 ? `${(item.value / 1000).toFixed(0)}ك` : ''}
                </span>
              </div>
              <span
                style={{
                  fontSize: '11px',
                  color: '#666',
                  textAlign: 'center',
                  transform: 'rotate(-45deg)',
                  transformOrigin: 'center',
                  whiteSpace: 'nowrap',
                  marginTop: '5px'
                }}
              >
                {item.label}
              </span>
            </div>
          )
        })}
      </div>
    </div>
  )
}

